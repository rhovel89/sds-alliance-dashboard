export default function DayCell({ date, events }: any) {
  const dayKey = date.toISOString().slice(0, 10);

  const dayEvents = events.filter((e: any) =>
    e.alliance_event_rules?.some(
      (r: any) =>
        dayKey >= r.effective_from &&
        dayKey <= r.until_date
    )
  );

  return (
    <div className={`day-cell ${dayEvents.length ? "has-event" : ""}`}>
      <span className="day-number">{date.getDate()}</span>

      {dayEvents.length > 0 && (
        <span
          className="event-dot"
          title={`${dayEvents.length} events`}
        />
      )}
    </div>
  );
}
