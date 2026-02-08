type Props = {
  date: Date | null;
  events: any[];
  onClick?: (date: string) => void;
};

function isoDate(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function DayCell({ date, events, onClick }: Props) {
  if (!date) return <div className="day empty" />;

  const dayEvents = events.filter(e => e.event_date === isoDate(date));

  return (
    <div className="day" onClick={() => onClick?.(isoDate(date))}>
      <div className="day-number">{date.getDate()}</div>

      {dayEvents.map(ev => (
        <div key={ev.id} className="event-chip">
          {ev.title}
        </div>
      ))}
    </div>
  );
}
