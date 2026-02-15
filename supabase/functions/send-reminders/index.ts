import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://pvngssnazuzekriakqds.supabase.co";
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

// Fallbacks (used only if alliance has no row in alliance_discord_settings)
const DEFAULT_WEBHOOK_URL = Deno.env.get("DISCORD_WEBHOOK_URL") ?? "";
const DEFAULT_ROLE_ID = Deno.env.get("DISCORD_ROLE_ID") ?? "1200201497326145616";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const reminderOffsets = [60, 30, 15, 5];

type DiscordCfg = { webhook_url: string; role_id: string | null; enabled: boolean };

function normRecurrenceType(e: any): string {
  return (e.recurrence_type ?? e.recurrence ?? "none").toString().toLowerCase().trim();
}

function parseDow(v: any): number[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map((x) => Number(x)).filter((n) => Number.isFinite(n));
  const cleaned = v.toString().replace(/[\[\]\s]/g, "");
  if (!cleaned) return [];
  return cleaned.split(",").map((s: string) => Number(s)).filter((n: number) => Number.isFinite(n));
}

const MS_MIN = 60_000;
const MS_DAY = 86_400_000;
const MS_WEEK = 7 * MS_DAY;

// Sunday-start UTC week; good enough for biweekly parity
function startOfUtcWeek(d: Date): Date {
  const dow = d.getUTCDay();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow, 0, 0, 0, 0));
}

function clampDom(y: number, m: number, dom: number): number {
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Math.min(dom, last);
}

// Generate candidate occurrences within next hour-ish window.
// Uses UTC ("game time") so offsets are stable.
function occurrencesInWindow(event: any, now: Date, windowEnd: Date): Date[] {
  const out: Date[] = [];
  if (!event.start_time_utc) return out;

  const base = new Date(event.start_time_utc);
  if (Number.isNaN(base.getTime())) return out;

  const rt = normRecurrenceType(event);

  // Non recurring
  if (rt === "none" || rt === "") {
    if (base >= now && base <= windowEnd) out.push(base);
    return out;
  }

  const hh = base.getUTCHours();
  const mm = base.getUTCMinutes();
  const ss = base.getUTCSeconds();
  const dom = base.getUTCDate();

  // We'll generate small candidate set: today/tomorrow for daily/weekly, this/next month for monthly.
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hh, mm, ss, 0));
  const tomorrowUtc = new Date(todayUtc.getTime() + MS_DAY);

  if (rt === "daily") {
    for (const cand of [todayUtc, tomorrowUtc]) {
      if (cand < base) continue;
      if (cand >= now && cand <= windowEnd) out.push(cand);
    }
    return out;
  }

  if (rt === "monthly") {
    const y1 = now.getUTCFullYear();
    const m1 = now.getUTCMonth();
    const d1 = clampDom(y1, m1, dom);
    const cand1 = new Date(Date.UTC(y1, m1, d1, hh, mm, ss, 0));

    const nextMonth = new Date(Date.UTC(y1, m1 + 1, 1, 0, 0, 0, 0));
    const y2 = nextMonth.getUTCFullYear();
    const m2 = nextMonth.getUTCMonth();
    const d2 = clampDom(y2, m2, dom);
    const cand2 = new Date(Date.UTC(y2, m2, d2, hh, mm, ss, 0));

    for (const cand of [cand1, cand2]) {
      if (cand < base) continue;
      if (cand >= now && cand <= windowEnd) out.push(cand);
    }
    return out;
  }

  // weekly / biweekly
  const dows = parseDow(event.recurrence_days ?? event.days_of_week);
  const wanted = dows.length ? dows : [base.getUTCDay()];

  for (const day of [todayUtc, tomorrowUtc]) {
    const dow = day.getUTCDay();
    if (!wanted.includes(dow)) continue;
    if (day < base) continue;
    if (day < now || day > windowEnd) continue;

    if (rt === "biweekly") {
      const wBase = startOfUtcWeek(base).getTime();
      const wCand = startOfUtcWeek(day).getTime();
      const weekIndex = Math.floor((wCand - wBase) / MS_WEEK);
      if (weekIndex % 2 !== 0) continue;
    }

    out.push(day);
  }

  return out;
}

serve(async () => {
  try {
    const now = new Date();
    const maxOffset = Math.max(...reminderOffsets);
    const windowEnd = new Date(now.getTime() + (maxOffset + 2) * MS_MIN);

    // 1) Load all discord settings once
    const { data: settings, error: settingsErr } = await supabase
      .from("alliance_discord_settings")
      .select("alliance_id, webhook_url, role_id, enabled");

    if (settingsErr) {
      console.error("Settings fetch error:", settingsErr);
      // Not fatal: we'll still fall back to DEFAULT_WEBHOOK_URL for everything.
    }

    const cfgMap = new Map<string, DiscordCfg>();
    (settings ?? []).forEach((s: any) => {
      cfgMap.set((s.alliance_id ?? "").toString().toUpperCase(), {
        webhook_url: s.webhook_url,
        role_id: s.role_id ?? null,
        enabled: s.enabled !== false
      });
    });

    // 2) Fetch events
    const { data: events, error } = await supabase
      .from("alliance_events")
      .select("*");

    if (error) {
      console.error("Fetch error:", error);
      return new Response("DB fetch error", { status: 500 });
    }

    for (const event of events ?? []) {
      if (!event.start_time_utc) continue;

      const allianceKey = (event.alliance_id ?? "").toString().toUpperCase();

      // Resolve per-alliance config, fallback to env defaults
      const cfg = cfgMap.get(allianceKey);
      const enabled = cfg ? cfg.enabled : true;
      if (!enabled) continue;

      const webhookUrl = cfg?.webhook_url || DEFAULT_WEBHOOK_URL;
      if (!webhookUrl) continue; // no route configured

      const roleId = cfg?.role_id ?? DEFAULT_ROLE_ID;

      // Build candidate occurrences within the reminder window
      const occs = occurrencesInWindow(event, now, windowEnd);

      for (const occStart of occs) {
        const occIso = occStart.toISOString();

        const diffMinutes = Math.floor((occStart.getTime() - now.getTime()) / 60000);

        for (const offset of reminderOffsets) {
          if (diffMinutes !== offset) continue;

          // 🔍 Dedup per occurrence + offset
          const { data: existing } = await supabase
            .from("reminder_logs")
            .select("id")
            .eq("event_id", event.id)
            .eq("offset_minutes", offset)
            .eq("occurrence_start_time_utc", occIso)
            .maybeSingle();

          if (existing) continue;

          const unix = Math.floor(occStart.getTime() / 1000);

          const ping = roleId ? `<@&${roleId}> ` : "";
          const allowed_mentions = roleId ? { parse: [], roles: [roleId] } : { parse: [] };

          // 🔔 Send Discord
          const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: `${ping}🔔 **${event.title}** starts in ${offset} minutes! (Starts <t:${unix}:R>)`,
              allowed_mentions
            }),
          });

          if (!res.ok) {
            const txt = await res.text().catch(() => "");
            console.error("Discord send failed:", res.status, txt);
            continue;
          }

          // 📝 Log reminder
          await supabase.from("reminder_logs").insert({
            event_id: event.id,
            offset_minutes: offset,
            occurrence_start_time_utc: occIso,
          });

          console.log(`Sent reminder for ${allianceKey} ${event.title} @ ${occIso} (${offset}m)`);
        }
      }
    }

    return new Response("Reminder check complete");
  } catch (err) {
    console.error("Reminder error:", err);
    return new Response("Error", { status: 500 });
  }
});
