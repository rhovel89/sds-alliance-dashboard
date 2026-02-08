import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAlliance } from "../../context/AllianceContext";
import MonthBlock from "./MonthBlock";
import EventModal from "./EventModal";

export default function PlannerGrid({ events, timezone }: any) {
  const { allianceId } = useAlliance();

  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now);
    d.setMonth(now.getMonth() + i);
    return d;
  });

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  function handleDayClick(date: string) {
    setSelectedDate(date);
    setModalOpen(true);
  }

  async function handleSave(event: any) {
    console.log("SAVING EVENT:", event);

    if (!allianceId) {
      alert("Alliance not loaded yet.");
      return;
    }

    const startLocal = new Date(`${event.date}T${event.startTime}`);
    const endLocal = new Date(`${event.date}T${event.endTime}`);

    const durationMinutes = Math.round(
      (endLocal.getTime() - startLocal.getTime()) / 60000
    );

    const startUtc = new Date(startLocal.toISOString());

    const { error } = await supabase
      .from("alliance_events")
      .insert({
        title: event.title,
        description: event.description ?? null,
        alliance_id: allianceId,
        start_time_utc: startUtc.toISOString(),
        duration_minutes: durationMinutes,
        recurrence_type: event.frequency.toLowerCase(),
        days_of_week: event.days ?? [],
        timezone_origin: Intl.DateTimeFormat().resolvedOptions().timeZone,
        send_reminders: true
      });

    if (error) {
      console.error("❌ Supabase insert failed:", error);
      alert(error.message);
    } else {
      console.log("✅ Event saved");
      setModalOpen(false);
    }
  }

  return (
    <div className="planner-grid">
      {months.map((month) => (
        <MonthBlock
          key={month.toISOString()}
          month={month}
          events={events}
          timezone={timezone}
          onDayClick={handleDayClick}
        />
      ))}

      <EventModal
        open={modalOpen}
        date={selectedDate}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
