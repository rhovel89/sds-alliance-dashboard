import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://pvngssnazuzekriakqds.supabase.co";

// Optional fallback (only used if alliance has no row configured)
const FALLBACK_DISCORD_WEBHOOK_URL = Deno.env.get("DISCORD_WEBHOOK_URL") ?? "";
const FALLBACK_DISCORD_ROLE_ID = Deno.env.get("DISCORD_ROLE_ID") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type DiscordSetting = {
  alliance_id: string;
  webhook_url: string | null;
  role_id: string | null;
  enabled: boolean | null;
};

function normalizeAllianceId(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function buildMention(roleIdRaw: string | null | undefined) {
  const roleId = String(roleIdRaw ?? "").trim();
  const lower = roleId.toLowerCase();

  // Special keywords for reliable server-wide pings
  if (lower === "everyone" || lower === "@everyone") {
    return {
      contentPrefix: "@everyone ",
      allowed_mentions: { parse: ["everyone"] as const },
    };
  }
  if (lower === "here" || lower === "@here") {
    return {
      contentPrefix: "@here ",
      allowed_mentions: { parse: ["here"] as const },
    };
  }

  // Normal role ping by ID
  if (roleId && /^[0-9]+$/.test(roleId)) {
    return {
      contentPrefix: `<@&${roleId}> `,
      allowed_mentions: { roles: [roleId] },
    };
  }

  // No mention
  return { contentPrefix: "", allowed_mentions: {} };
}

serve(async (req) => {
  try {
    const now = new Date();

    // Load discord settings (per alliance)
    const { data: discordRows, error: discordErr } = await supabase
      .from("alliance_discord_settings")
      .select("alliance_id, webhook_url, role_id, enabled");

    if (discordErr) {
      console.error("Discord settings fetch error:", discordErr);
      // continue anyway (fallback env webhook might still work)
    }

    const discordMap = new Map<string, DiscordSetting>();
    for (const row of (discordRows ?? []) as any[]) {
      const aid = normalizeAllianceId(row.alliance_id);
      if (!aid) continue;
      discordMap.set(aid, {
        alliance_id: aid,
        webhook_url: row.webhook_url ?? null,
        role_id: row.role_id ?? null,
        enabled: row.enabled ?? true,
      });
    }

    // Only fetch events in the next ~61 minutes (cheaper + safer)
    const windowMax = new Date(now.getTime() + 61 * 60 * 1000);

    const { data: events, error: evErr } = await supabase
      .from("alliance_events")
      .select("id, alliance_id, title, start_time_utc")
      .gte("start_time_utc", now.toISOString())
      .lte("start_time_utc", windowMax.toISOString());

    if (evErr) {
      console.error("Events fetch error:", evErr);
      return new Response("DB fetch error", { status: 500 });
    }

    const reminderOffsets = [60, 30, 15, 5];

    for (const event of (events ?? []) as any[]) {
      const allianceId = normalizeAllianceId(event.alliance_id);
      if (!event.start_time_utc) continue;

      const start = new Date(event.start_time_utc);
      const diffMs = start.getTime() - now.getTime();

      // round-to-nearest-minute to avoid missing due to seconds drift
      const diffMinutes = Math.floor((diffMs + 30000) / 60000);

      if (diffMs <= 0) continue;

      for (const offset of reminderOffsets) {
        if (diffMinutes !== offset) continue;

        // Dedupe check
        const { data: existing } = await supabase
          .from("reminder_logs")
          .select("id")
          .eq("event_id", event.id)
          .eq("offset_minutes", offset)
          .maybeSingle();

        if (existing) continue;

        // Pick webhook + role per alliance (fallback to env if missing)
        const setting = allianceId ? discordMap.get(allianceId) : undefined;
        const enabled = setting ? (setting.enabled !== false) : true;

        if (!enabled) continue;

        const webhookUrl =
          (setting?.webhook_url && String(setting.webhook_url).trim() !== "")
            ? String(setting.webhook_url).trim()
            : (FALLBACK_DISCORD_WEBHOOK_URL || "");

        if (!webhookUrl) {
          console.log(`No webhook configured for alliance ${allianceId || "(unknown)"}; skipping reminder.`);
          continue;
        }

        const roleId =
          (setting?.role_id && String(setting.role_id).trim() !== "")
            ? String(setting.role_id).trim()
            : (FALLBACK_DISCORD_ROLE_ID || "");

        const mention = buildMention(roleId);

        const title = String(event.title ?? "Event").trim();

        // Send Discord message
        const body = {
          content: `${mention.contentPrefix}🔔 **${title}** starts in ${offset} minutes!`,
          allowed_mentions: mention.allowed_mentions,
        };

        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error("Discord send failed:", res.status, text);
          continue;
        }

        // Log sent reminder
        const logRes = await supabase.from("reminder_logs").insert({
          event_id: event.id,
          offset_minutes: offset,
        });

        if (logRes.error) {
          console.error("Reminder log insert error:", logRes.error);
        } else {
          console.log(`Sent reminder: ${allianceId} / ${title} (${offset}m)`);
        }
      }
    }

    return new Response("Reminder check complete");
  } catch (err) {
    console.error("Reminder error:", err);
    return new Response("Error", { status: 500 });
  }
});
