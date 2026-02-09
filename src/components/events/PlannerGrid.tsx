import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import MonthBlock from "./MonthBlock";
import EventModal from "./EventModal";

export default function PlannerGrid({ events, alliance_id, onEventsChanged }: any) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);

  function handleDayClick(date: string) {
    setSelectedDate(date);
    setEditingEvent(null);
  }

  function handleSaved(event: any) {
    onEventsChanged((prev: any[]) => {
      const next = prev.filter(e => e.id !== event.id);
      return [...next, event].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
    });
  }

  function handleDeleted(id: string) {
    onEventsChanged((prev: any[]) => prev.filter(e => e.id !== id));
  }

  return (
    <div className="planner-grid">
      <MonthBlock
        events={events}
        onDayClick={handleDayClick}
      />

      {selectedDate && (
        <EventModal
          open={true}
          date={selectedDate}
          event={editingEvent}
          alliance_id={alliance_id}
          onClose={() => setSelectedDate(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
