import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://pvngssnazuzekriakqds.supabase.co";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type DiscordSetting = {
  alliance_id: string;
  webhook_url: string | null;
  role_id: string | null;
  enabled: boolean;
};

function buildMention(roleIdRaw: string | null | undefined) {
  const roleId = (roleIdRaw ?? "").trim();
  const lower = roleId.toLowerCase();

  if (lower === "everyone" || lower === "@everyone") {
    return { prefix: "@everyone", allowed_mentions: { parse: ["everyone"] as const } };
  }
  if (lower === "here" || lower === "@here") {
    return { prefix: "@here", allowed_mentions: { parse: ["everyone"] as const } };
  }
  if (roleId) {
    return { prefix: `<@&${roleId}>`, allowed_mentions: { roles: [roleId] } };
  }
  return { prefix: "", allowed_mentions: { parse: [] as const } };
}

const DAY_MAP: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

function toDow(v: string): number | null {
  const k = v.trim().toLowerCase();
  return k in DAY_MAP ? DAY_MAP[k] : null;
}

function daysInUtcMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

function startOfUtcWeek(d: Date) {
  const day = d.getUTCDay();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
}

function parseEndClamp(endDate: any): Date | null {
  if (!endDate) return null;
  const [yy, mm, dd] = String(endDate).split("-").map(Number);
  if (!yy || !mm || !dd) return null;
  return new Date(Date.UTC(yy, mm - 1, dd, 23, 59, 59, 999));
}

function occurrencesInWindow(event: any, windowStart: Date, windowEnd: Date): string[] {
  if (!event.start_time_utc) return [];
  const base = new Date(event.start_time_utc);

  const enabled = !!event.recurring_enabled;
  const rtype = String(event.recurrence_type ?? "").toLowerCase();
  const endClamp = parseEndClamp(event.recurrence_end_date);

  if (!enabled || !rtype) {
    if (base >= windowStart && base <= windowEnd) return [base.toISOString()];
    return [];
  }

  const baseH = base.getUTCHours();
  const baseM = base.getUTCMinutes();
  const baseS = base.getUTCSeconds();
  const baseMs = base.getUTCMilliseconds();

  const rawDays: string[] = Array.isArray(event.recurrence_days) ? event.recurrence_days : [];
  const parsed = rawDays.map(toDow).filter((x): x is number => x !== null);
  const allowedDays =
    (rtype === "weekly" || rtype === "biweekly")
      ? (parsed.length ? parsed : [base.getUTCDay()])
      : [];

  // Check only a few days around the window (cheap + safe for 61m window)
  const startDay = new Date(Date.UTC(windowStart.getUTCFullYear(), windowStart.getUTCMonth(), windowStart.getUTCDate() - 1));
  const endDay = new Date(Date.UTC(windowEnd.getUTCFullYear(), windowEnd.getUTCMonth(), windowEnd.getUTCDate() + 1));

  const out: string[] = [];

  for (let t = startDay.getTime(); t <= endDay.getTime(); t += 24 * 60 * 60 * 1000) {
    const d = new Date(t);
    let cand = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), baseH, baseM, baseS, baseMs));

    if (cand < base) continue;
    if (cand < windowStart || cand > windowEnd) continue;
    if (endClamp && cand > endClamp) continue;

    if (rtype === "daily") {
      // ok
    } else if (rtype === "weekly") {
      if (!allowedDays.includes(cand.getUTCDay())) continue;
    } else if (rtype === "biweekly") {
      if (!allowedDays.includes(cand.getUTCDay())) continue;
      const weeksDiff = Math.floor((startOfUtcWeek(cand).getTime() - startOfUtcWeek(base).getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (weeksDiff % 2 !== 0) continue;
    } else if (rtype === "monthly") {
      const baseDay = base.getUTCDate();
      const dim = daysInUtcMonth(cand.getUTCFullYear(), cand.getUTCMonth());
      const effectiveDay = Math.min(baseDay, dim);
      if (cand.getUTCDate() !== effectiveDay) continue;
    } else {
      continue;
    }

    out.push(cand.toISOString());
  }

  return out;
}

serve(async () => {
  try {
    const now = new Date();

    // Per-alliance discord settings
    const { data: settings, error: settingsErr } = await supabase
      .from("alliance_discord_settings")
      .select("alliance_id, webhook_url, role_id, enabled");

    if (settingsErr) {
      console.error("Settings fetch error:", settingsErr);
      return new Response("Settings fetch error", { status: 500 });
    }

    const settingsMap = new Map<string, DiscordSetting>();
    (settings ?? []).forEach((s: any) => {
      settingsMap.set(String(s.alliance_id ?? "").toUpperCase(), s as DiscordSetting);
    });

    const reminderOffsets = [60, 30, 15, 5];
    const windowStart = now;
    const windowEnd = new Date(now.getTime() + 61 * 60000);

    // Fetch events broadly; occurrences filter is cheap
    const { data: events, error } = await supabase
      .from("alliance_events")
      .select("*");

    if (error) {
      console.error("Events fetch error:", error);
      return new Response("DB fetch error", { status: 500 });
    }

    for (const event of events ?? []) {
      const allianceId = String(event.alliance_id ?? "").toUpperCase();
      const cfg = settingsMap.get(allianceId);
      if (!cfg || !cfg.enabled || !cfg.webhook_url) continue;

      const occs = occurrencesInWindow(event, windowStart, windowEnd);
      if (!occs.length) continue;

      for (const occIso of occs) {
        const occStart = new Date(occIso);
        const diffMinutes = Math.floor((occStart.getTime() - now.getTime()) / 60000);

        for (const offset of reminderOffsets) {
          if (diffMinutes !== offset) continue;

          // dedupe per occurrence
          const { data: existing } = await supabase
            .from("reminder_logs")
            .select("id")
            .eq("event_id", event.id)
            .eq("offset_minutes", offset)
            .eq("occurrence_time_utc", occIso)
            .maybeSingle();

          if (existing) continue;

          const { prefix, allowed_mentions } = buildMention(cfg.role_id);
          const content = `${prefix ? prefix + " " : ""}🔔 **${event.title}** starts in ${offset} minutes!`;

          const resp = await fetch(cfg.webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content, allowed_mentions }),
          });

          if (!resp.ok) {
            const txt = await resp.text().catch(() => "");
            console.error("Discord webhook failed:", resp.status, txt);
            continue;
          }

          await supabase.from("reminder_logs").insert({
            event_id: event.id,
            offset_minutes: offset,
            occurrence_time_utc: occIso,
          });

          console.log(`Sent reminder ${allianceId}: ${event.title} (${offset}m) @ ${occIso}`);
        }
      }
    }

    return new Response("Reminder check complete");
  } catch (err) {
    console.error("Reminder error:", err);
    return new Response("Error", { status: 500 });
  }
});
