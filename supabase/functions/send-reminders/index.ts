import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
const DISCORD_WEBHOOK_URL = Deno.env.get("DISCORD_WEBHOOK_URL")!;
const DISCORD_ROLE_ID = Deno.env.get("DISCORD_ROLE_ID")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  SERVICE_ROLE_KEY
);

serve(async () => {
  const now = new Date();

  const reminderWindows = [60, 30, 15, 5]; // minutes before event

  const { data: events, error } = await supabase
    .from("alliance_events")
    .select("*");

  if (error) {
    console.error(error);
    return new Response("Error fetching events", { status: 500 });
  }

  for (const event of events || []) {
    const eventTime = new Date(event.start_time_utc);

    const diffMinutes = Math.floor(
      (eventTime.getTime() - now.getTime()) / 60000
    );

    if (reminderWindows.includes(diffMinutes)) {
      const message = {
        content:
          `<@&${DISCORD_ROLE_ID}> 🔔 **${event.title}** starts in ${diffMinutes} minutes!\n` +
          `📅 ${event.start_date} ⏰ ${event.start_time}`
      };

      await fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });
    }
  }

  return new Response("Reminders processed");
});
