import { useMemo, useState } from "react";
import MonthBlock from "./MonthBlock";
import EventModal from "./EventModal";
import "./events.css";

type Props = {
  events: any[];
  onCreate?: (payload: any) => Promise<void>;
};

export default function PlannerGrid({ events, onCreate }: Props) {
  const now = new Date();

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now);
      d.setMonth(now.getMonth() + i);
      d.setDate(1);
      return d;
    });
  }, [now]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  function handleDayClick(isoDate: string) {
    setSelectedDate(isoDate);
    setModalOpen(true);
  }

  return (
    <div className="planner-grid">
      {months.map((m) => (
        <MonthBlock
          key={m.toISOString()}
          month={m}
          events={events}
          onDayClick={handleDayClick}
        />
      ))}

      <EventModal
        open={modalOpen}
        date={selectedDate}
        onClose={() => setModalOpen(false)}
        onSave={async (payload: any) => {
          if (onCreate) await onCreate(payload);
          setModalOpen(false);
        }}
      />
    </div>
  );
}
