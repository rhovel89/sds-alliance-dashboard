import { useState } from "react";
import MonthBlock from "./MonthBlock";
import EventModal from "./EventModal";

export default function PlannerGrid({ events, allianceId, onEventsChanged }: any) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  function handleCreate(date: string) {
    setSelectedDate(date);
    setEditingEvent(null);
    setModalOpen(true);
  }

  function handleEdit(event: any) {
    setSelectedDate(event.event_date);
    setEditingEvent(event);
    setModalOpen(true);
  }

  return (
    <>
      <MonthBlock
        date={new Date()}
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
