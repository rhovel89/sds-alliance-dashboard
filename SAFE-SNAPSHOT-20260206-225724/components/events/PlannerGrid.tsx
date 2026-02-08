import MonthBlock from "./MonthBlock";
import EventModal from "./EventModal";
import { useState } from "react";

export default function PlannerGrid({ events, allianceId, onEventsChanged }: any) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  function handleCreate(date: Date) {
    setSelectedDate(date);
    setEditingEvent(null);
    setModalOpen(true);
  }

  function handleEdit(event: any) {
    setSelectedDate(event.startDate);
    setEditingEvent(event);
    setModalOpen(true);
  }

  return (
    <>
      <MonthBlock
        events={events}
        onCreate={handleCreate}
        onEventClick={handleEdit}
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
