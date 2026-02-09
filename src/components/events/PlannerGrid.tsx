import { useState } from "react";
import MonthBlock from "./MonthBlock";
import EventModal from "./EventModal";

export default function PlannerGrid({ events, alliance_id, onEventsChanged }: any) {
const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  function openCreate(dateIso: string) {
    setSelectedDate(dateIso);
    setEditingEvent(null);
    setModalOpen(true);
  }

  function openEdit(event: any) {
    setSelectedDate(event.event_date);
    setEditingEvent(event);
    setModalOpen(true);
  }

  return (
    <>
      <MonthBlock
        events={events}
        onCreate={openCreate}
        onEventClick={openEdit}
      />

      <EventModal
        open={modalOpen}
        date={selectedDate}
        event={editingEvent}
        alliance_id={alliance_id}
        onClose={() => setModalOpen(false)}
        onSaved={onEventsChanged}
      />
    </>
  );
}

