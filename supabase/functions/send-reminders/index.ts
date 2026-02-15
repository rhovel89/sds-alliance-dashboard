import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
const DISCORD_WEBHOOK_URL = Deno.env.get("DISCORD_WEBHOOK_URL")!;
const DISCORD_ROLE_ID = "1200201497326145616"; // ✅ Your role ID hard-set safely

const SUPABASE_URL = "https://pvngssnazuzekriakqds.supabase.co";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

serve(async () => {
  try {
    const now = new Date();

    // Fetch all events
    const { data: events, error } = await supabase
      .from("alliance_events")
      .select("*");

    if (error) {
      console.error("Fetch error:", error);
      return new Response("DB fetch error", { status: 500 });
    }

    const reminderOffsets = [60, 30, 15, 5];

    for (const event of events ?? []) {
      if (!event.start_time_utc) continue;

      const start = new Date(event.start_time_utc);
      const diffMinutes = Math.floor(
        (start.getTime() - now.getTime()) / 60000
      );

      for (const offset of reminderOffsets) {
        if (diffMinutes === offset) {

          // 🔍 Check if already sent
          const { data: existing } = await supabase
            .from("reminder_logs")
            .select("id")
            .eq("event_id", event.id)
            .eq("offset_minutes", offset)
            .maybeSingle();

          if (existing) continue;

          // 🔔 Send Discord message with role mention
          await fetch(DISCORD_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content:
                `<@&${DISCORD_ROLE_ID}> 🔔 **${event.title}** starts in ${offset} minutes!`,
              allowed_mentions: {
                roles: [DISCORD_ROLE_ID]
              }
            }),
          });

          // 📝 Log reminder
          await supabase.from("reminder_logs").insert({
            event_id: event.id,
            offset_minutes: offset,
          });

          console.log(`Sent reminder for ${event.title} (${offset}m)`);
        }
      }
    }

    return new Response("Reminder check complete");
  } catch (err) {
    console.error("Reminder error:", err);
    return new Response("Error", { status: 500 });
  }
});
