type DayCellProps = {
  date: Date;
  events: any[];
  onEventClick: (event: any) => void;
};

export default function DayCell({ date, events, onEventClick }: DayCellProps) {
  const dayKey = date.toISOString().slice(0, 10);

  const dayEvents = events.filter(
    (e) => e.event_date === dayKey
  );

  return (
    <div className="calendar-day">
      <div className="day-number">{date.getDate()}</div>

      {dayEvents.map((event) => (
        <div
          key={event.id}
          className="calendar-event"
          onClick={() => onEventClick(event)}
        >
          {event.title}
        </div>
      ))}
    </div>
  );
}
