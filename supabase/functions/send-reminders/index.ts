import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://pvngssnazuzekriakqds.supabase.co";
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

// Optional fallback (only used if no DB settings row exists)
const FALLBACK_WEBHOOK_URL = Deno.env.get("DISCORD_WEBHOOK_URL") ?? "";
const FALLBACK_ROLE_ID = Deno.env.get("DISCORD_ROLE_ID") ?? "1200201497326145616";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function authOk(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  // Require the exact Bearer token you already use in cron net.http_post
  return auth === `Bearer ${SERVICE_ROLE_KEY}`;
}

function shouldSendWindow(now: Date, start: Date, offsetMin: number) {
  const diffSec = (start.getTime() - now.getTime()) / 1000;
  if (diffSec <= 0) return false; // already started/past
  const upper = offsetMin * 60;       // e.g. 3600
  const lower = upper - 60;           // e.g. 3540 (one-minute window)
  return diffSec <= upper && diffSec > lower;
}

function buildDiscordPayload(roleId: string | null, title: string, offset: number) {
  const rid = (roleId ?? "").trim();

  // Special-case: allow storing literal "everyone" in DB
  if (rid.toLowerCase() === "everyone") {
    return {
      content: `@everyone 🔔 **${title}** starts in ${offset} minutes!`,
      allowed_mentions: { parse: ["everyone"] },
    };
  }

  if (rid) {
    return {
      content: `<@&${rid}> 🔔 **${title}** starts in ${offset} minutes!`,
      allowed_mentions: { roles: [rid] },
    };
  }

  return {
    content: `🔔 **${title}** starts in ${offset} minutes!`,
    allowed_mentions: { parse: [] },
  };
}

serve(async (req) => {
  try {
    if (!authOk(req)) {
      return new Response("Unauthorized", { status: 401 });
    }

    const now = new Date();
    const reminderOffsets = [60, 30, 15, 5];

    // 1) Load per-alliance discord settings (preferred)
    const { data: settings, error: settingsErr } = await supabase
      .from("alliance_discord_settings")
      .select("alliance_id, webhook_url, role_id, enabled");

    const settingsMap = new Map<string, { webhook_url: string; role_id: string | null; enabled: boolean }>();
    if (!settingsErr && settings) {
      for (const s of settings) {
        settingsMap.set(String(s.alliance_id).toUpperCase(), {
          webhook_url: String(s.webhook_url || ""),
          role_id: s.role_id ? String(s.role_id) : null,
          enabled: !!s.enabled,
        });
      }
    }

    // 2) Only fetch events that could possibly match (next ~61 minutes)
    const maxOffset = Math.max(...reminderOffsets);
    const windowEnd = new Date(now.getTime() + (maxOffset + 1) * 60 * 1000).toISOString();

    const { data: events, error: eventsErr } = await supabase
      .from("alliance_events")
      .select("id, alliance_id, title, start_time_utc")
      .gte("start_time_utc", now.toISOString())
      .lte("start_time_utc", windowEnd);

    if (eventsErr) {
      console.error("DB fetch error:", eventsErr);
      return new Response("DB fetch error", { status: 500 });
    }

    let sentCount = 0;

    for (const event of events ?? []) {
      if (!event.start_time_utc) continue;

      const allianceId = String(event.alliance_id || "").toUpperCase();
      const start = new Date(event.start_time_utc);

      // determine webhook + role
      const conf = settingsMap.get(allianceId);
      const webhookUrl =
        conf && conf.enabled && conf.webhook_url ? conf.webhook_url : FALLBACK_WEBHOOK_URL;

      const roleId =
        conf && conf.enabled ? (conf.role_id ?? FALLBACK_ROLE_ID) : FALLBACK_ROLE_ID;

      if (!webhookUrl) continue;

      for (const offset of reminderOffsets) {
        if (!shouldSendWindow(now, start, offset)) continue;

        // Dedupe: try with occurrence_start_time_utc if the column exists; otherwise fallback to event_id+offset
        let alreadySent = false;

        // Attempt: filter by occurrence_start_time_utc (if present)
        const q1 = await supabase
          .from("reminder_logs")
          .select("id")
          .eq("event_id", event.id)
          .eq("offset_minutes", offset)
          // @ts-ignore (column may or may not exist)
          .eq("occurrence_start_time_utc", event.start_time_utc)
          .maybeSingle();

        if (!q1.error && q1.data) {
          alreadySent = true;
        }

        if (q1.error) {
          // Fallback (column likely missing)
          const q2 = await supabase
            .from("reminder_logs")
            .select("id")
            .eq("event_id", event.id)
            .eq("offset_minutes", offset)
            .maybeSingle();

          if (q2.data) alreadySent = true;
        }

        if (alreadySent) continue;

        const payload = buildDiscordPayload(roleId, event.title ?? "Event", offset);

        const resp = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          console.error("Discord webhook failed:", resp.status, text);
          continue;
        }

        // Log reminder (try with occurrence_start_time_utc; fallback if column missing)
        const ins1 = await supabase.from("reminder_logs").insert({
          event_id: event.id,
          offset_minutes: offset,
          // @ts-ignore (column may or may not exist)
          occurrence_start_time_utc: event.start_time_utc,
        });

        if (ins1.error) {
          await supabase.from("reminder_logs").insert({
            event_id: event.id,
            offset_minutes: offset,
          });
        }

        sentCount++;
        console.log(`Sent reminder: ${allianceId} ${event.title} (${offset}m)`);
      }
    }

    return new Response(`OK (sent=${sentCount})`);
  } catch (err) {
    console.error("Reminder error:", err);
    return new Response("Error", { status: 500 });
  }
});
