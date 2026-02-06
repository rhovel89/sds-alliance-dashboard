import { useState } from "react";
import MonthBlock from "./MonthBlock";
import EventModal from "./EventModal";

export default function PlannerGrid({ events, allianceId, onEventsChanged }: any) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  function handleDayCreate(date: string) {
    setSelectedDate(date);
    setEditingEvent(null);
    setModalOpen(true);
  }

  function handleEventEdit(event: any) {
    setSelectedDate(event.event_date);
    setEditingEvent(event);
    setModalOpen(true);
  }

  return (
    <>
      <MonthBlock
        events={events}
        onCreate={handleDayCreate}
        onEventClick={handleEventEdit}
      />

      <EventModal
        open={modalOpen}
        date={selectedDate}
        event={editingEvent}
        allianceId={allianceId}
        onClose={() => setModalOpen(false)}
        onSaved={onEventsChanged}
      />
    </>
  );
}
