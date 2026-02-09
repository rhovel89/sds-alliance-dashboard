import { useParams } from "react-router-dom";
import { useState } from "react";
import MonthBlock from "./MonthBlock";
import EventModal from "./EventModal";

export default function PlannerGrid({ events, allianceId, onEventsChanged }: any) {
  const { allianceId } = useParams<{ allianceId: string }>();
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
        allianceId={allianceId}
        onClose={() => setModalOpen(false)}
        onSaved={onEventsChanged}
      />
    </>
  );
}

