import { useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAlliance } from "../../context/AllianceContext";
import MonthBlock from "./MonthBlock";
import EventModal from "./EventModal";

export default function PlannerGrid({ events }: any) {
  const { allianceId } = useAlliance();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const now = new Date();
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now);
      d.setMonth(now.getMonth() + i);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDayClick(dateISO: string) {
    setSelectedDate(dateISO);
    setModalOpen(true);
  }

  async function reloadEvents() {
    if (!allianceId) return;
    const { data, error } = await supabase
      .from("alliance_events")
      .select("*")
      .eq("alliance_id", String(allianceId))
      .order("start_time_utc", { ascending: true });

    if (error) console.error("❌ Reload events failed:", error);
    // We can’t set EventsPage state from here (different component),
    // so we force a refresh; Vite SPA reload is acceptable for now.
    window.location.reload();
  }

  return (
    <div className="planner-grid">
      {months.map((month) => (
        <MonthBlock
          key={month.toISOString()}
          month={month}
          events={events}
          onDayClick={handleDayClick}
        />
      ))}

      <EventModal
        open={modalOpen}
        date={selectedDate}
        onClose={() => setModalOpen(false)}
        onSave={async (payload: any) => {
          try {
            if (!allianceId) {
              alert("No alliance selected");
              return;
            }

            const { data: auth } = await supabase.auth.getUser();
            const userId = auth?.user?.id;
            if (!userId) {
              alert("Not logged in");
              return;
            }

            // Convert date + startTime to UTC timestamp string
            // (treat input as local time)
            const startLocal = new Date(`${payload.date}T${payload.startTime}:00`);
            const endLocal = new Date(`${payload.date}T${payload.endTime}:00`);
            const durationMinutes = Math.max(
              1,
              Math.round((endLocal.getTime() - startLocal.getTime()) / 60000)
            );

            const timezoneOrigin =
              Intl.DateTimeFormat().resolvedOptions().timeZone || "local";

            const row: any = {
              alliance_id: String(allianceId),
              title: payload.title,
              description: payload.description || null,
              start_time_utc: startLocal.toISOString(),
              duration_minutes: durationMinutes,
              timezone_origin: timezoneOrigin,
              send_reminders: payload.sendReminders ? true : false,
              discord_channel_id: payload.discordChannelId || null,
              created_by: userId,

              // DB columns from your schema:
              // recurrence_type (enum), recurrence_days (array), days_of_week (array)
              recurrence_type: payload.recurrenceType, // we'll align enum in Supabase Step 13
              recurrence_days: payload.recurrenceDays || null,
              days_of_week: payload.daysOfWeek || null,
            };

            console.log("SAVING EVENT:", row);

            const { error } = await supabase.from("alliance_events").insert(row);
            if (error) {
              console.error("❌ Supabase insert failed:", error);
              alert(error.message);
              return;
            }

            console.log("✅ Event saved");
            setModalOpen(false);
            await reloadEvents();
          } catch (e: any) {
            console.error("❌ Save failed:", e);
            alert(e?.message || "Save failed");
          }
        }}
      />
    </div>
  );
}
