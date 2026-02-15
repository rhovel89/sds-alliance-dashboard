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

  // Special handling for @everyone/@here
  const lower = roleId.toLowerCase();
  const isEveryone =
    lower === "everyone" || lower === "@everyone" || roleId === "1438414858574889073";
  const isHere = lower === "here" || lower === "@here";

  if (isEveryone) {
    return {
      prefix: "@everyone",
      allowed_mentions: { parse: ["everyone"] as const },
    };
  }

  if (isHere) {
    return {
      prefix: "@here",
      allowed_mentions: { parse: ["everyone"] as const },
    };
  }

  // Normal role mention
  if (roleId) {
    return {
      prefix: `<@&${roleId}>`,
      allowed_mentions: { roles: [roleId] },
    };
  }

  // No mention
  return {
    prefix: "",
    allowed_mentions: { parse: [] as const },
  };
}

serve(async () => {
  try {
    const now = new Date();

    // Load discord settings once per run (multi-alliance safe)
    const { data: settings, error: settingsErr } = await supabase
      .from("alliance_discord_settings")
      .select("alliance_id, webhook_url, role_id, enabled");

    if (settingsErr) {
      console.error("Settings fetch error:", settingsErr);
      return new Response("Settings fetch error", { status: 500 });
    }

    const settingsMap = new Map<string, DiscordSetting>();
    (settings ?? []).forEach((s: any) => {
      const key = String(s.alliance_id ?? "").toUpperCase();
      settingsMap.set(key, s as DiscordSetting);
    });

    const reminderOffsets = [60, 30, 15, 5];

    // Only fetch events in the next 61 minutes (keeps it fast)
    const windowStart = now.toISOString();
    const windowEnd = new Date(now.getTime() + 61 * 60000).toISOString();

    const { data: events, error } = await supabase
      .from("alliance_events")
      .select("*")
      .gte("start_time_utc", windowStart)
      .lte("start_time_utc", windowEnd);

    if (error) {
      console.error("Events fetch error:", error);
      return new Response("DB fetch error", { status: 500 });
    }

    for (const event of events ?? []) {
      if (!event.start_time_utc) continue;

      const allianceId = String(event.alliance_id ?? "").toUpperCase();
      if (!allianceId) continue;

      const cfg = settingsMap.get(allianceId);
      if (!cfg || !cfg.enabled || !cfg.webhook_url) {
        // No webhook configured for this alliance → skip safely
        continue;
      }

      const start = new Date(event.start_time_utc);
      const diffMinutes = Math.floor((start.getTime() - now.getTime()) / 60000);

      for (const offset of reminderOffsets) {
        if (diffMinutes !== offset) continue;

        // dedupe check
        const { data: existing, error: existingErr } = await supabase
          .from("reminder_logs")
          .select("id")
          .eq("event_id", event.id)
          .eq("offset_minutes", offset)
          .maybeSingle();

        if (existingErr) {
          console.error("Reminder log check error:", existingErr);
          continue;
        }
        if (existing) continue;

        const { prefix, allowed_mentions } = buildMention(cfg.role_id);
        const content = `${prefix ? prefix + " " : ""}🔔 **${event.title}** starts in ${offset} minutes!`;

        // send to THIS alliance webhook
        const resp = await fetch(cfg.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            allowed_mentions,
          }),
        });

        if (!resp.ok) {
          const txt = await resp.text().catch(() => "");
          console.error("Discord webhook failed:", resp.status, txt);
          continue;
        }

        // log reminder
        const { error: logErr } = await supabase.from("reminder_logs").insert({
          event_id: event.id,
          offset_minutes: offset,
        });

        if (logErr) {
          console.error("Reminder log insert error:", logErr);
          continue;
        }

        console.log(`Sent reminder for ${allianceId}: ${event.title} (${offset}m)`);
      }
    }

    return new Response("Reminder check complete");
  } catch (err) {
    console.error("Reminder error:", err);
    return new Response("Error", { status: 500 });
  }
});
