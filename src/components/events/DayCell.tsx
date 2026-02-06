export default function DayCell({ date, events, timezone, onDayClick }: any) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const dayEvents = events.filter((e: any) => {
    const start = new Date(e.start_time_utc);
    return start >= dayStart && start <= dayEnd;
  });

  return (
    <div
      className="calendar-day"
      onClick={() =>
        onDayClick?.(dayStart.toISOString().slice(0, 10))
      }
      style={{ cursor: "pointer" }}
    >
      <div className="day-number">{dayStart.getDate()}</div>

      {dayEvents.map((e: any) => (
        <div key={e.id} className="event-chip">
          {e.title}
        </div>
      ))}
    </div>
  );
}
