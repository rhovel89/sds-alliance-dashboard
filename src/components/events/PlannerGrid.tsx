import { useState, useMemo } from "react";
import MonthBlock from "./MonthBlock";
import EventModal from "./EventModal";
import { supabase } from "../../lib/supabaseClient";
import { useAlliance } from "../../context/AllianceContext";

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

  const normalizedEvents = useMemo(() => {
    return (events || []).map((e: any) => {
      const d = new Date(e.start_time_utc);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
      return {
        ...e,
        __dayKey: local.toISOString().slice(0, 10),
      };
    });
  }, [events]);

  function handleDayClick(date: string) {
    setSelectedDate(date);
    setModalOpen(true);
  }

  async function handleSave(event: any) {
    if (!allianceId) return;

    const start = new Date(`${event.date}T${event.startTime}:00`);
    const end = new Date(`${event.date}T${event.endTime}:00`);
    const durationMinutes = Math.max(1, (end.getTime() - start.getTime()) / 60000);

    const { error } = await supabase.from("alliance_events").insert({
      title: event.title,
      alliance_id: allianceId,
      start_time_utc: start.toISOString(),
      duration_minutes: durationMinutes,
      recurrence_type: event.frequency || "once",
      days_of_week: event.days || [],
      timezone_origin: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    if (error) {
      console.error("❌ Supabase insert failed:", error);
      return;
    }

    window.location.reload();
  }

  return (
    <div className="planner-grid">
      {months.map((month) => (
        <MonthBlock
          key={month.toISOString()}
          month={month}
          events={normalizedEvents}
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
