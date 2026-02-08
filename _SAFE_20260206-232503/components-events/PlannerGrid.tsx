import { useMemo, useState } from "react";
import MonthBlock from "./MonthBlock";
import EventModal from "./EventModal";

export default function PlannerGrid({ events, allianceId, onEventsChanged }: any) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const todayIso = useMemo(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return ${d.getFullYear()}--;
  }, []);

  function openCreate(dateIso: string) {
    setSelectedDate(dateIso);
    setEditingEvent(null);
    setModalOpen(true);
  }

  function openEdit(ev: any) {
    const dateIso =
      ev?.event_date ||
      (ev?.startDate instanceof Date
        ? ${ev.startDate.getFullYear()}--
        : null);

    setSelectedDate(dateIso || todayIso);
    setEditingEvent(ev);
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
