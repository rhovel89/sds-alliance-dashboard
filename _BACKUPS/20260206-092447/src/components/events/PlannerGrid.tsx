import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAlliance } from "../../context/AllianceContext";
import MonthBlock from "./MonthBlock";
import EventModal from "./EventModal";

export default function PlannerGrid({ events, timezone, onEventSaved }: any) {
  const { allianceId } = useAlliance();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  function handleDayClick(date: string) {
    setSelectedDate(date);
    setModalOpen(true);
  }

  async function handleSave(event: any) {
    if (!allianceId) return;

    const payload = {
      title: event.title,
      alliance_id: allianceId,
      start_time_utc: new Date(
        `${event.date}T${event.startTime}:00`
      ).toISOString(),
      duration_minutes:
        (Number(event.endTime.split(":")[0]) * 60 +
          Number(event.endTime.split(":")[1])) -
        (Number(event.startTime.split(":")[0]) * 60 +
          Number(event.startTime.split(":")[1])),
      recurrence_type: event.frequency,
      days_of_week: event.days || [],
      timezone_origin: Intl.DateTimeFormat().resolvedOptions().timeZone,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    };

    const { error } = await supabase.from("alliance_events").insert(payload);

    if (error) {
      console.error("❌ Supabase insert failed:", error);
      return;
    }

    setModalOpen(false);
    setSelectedDate(null);

    if (onEventSaved) {
      onEventSaved();
    }
  }

  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now);
    d.setMonth(now.getMonth() + i);
    return d;
  });

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


