function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSameISODate(startUtc: string, iso: string) {
  // start_time_utc is UTC; we want to show by local calendar date.
  const local = new Date(startUtc);
  const localISO = toISODate(local);
  return localISO === iso;
}

export default function DayCell({ date, events, onDayClick }: any) {
  if (!date) return <div className="day-cell day-empty" />;

  const iso = toISODate(date);

  const dayEvents =
    (events || []).filter((e: any) => e?.start_time_utc && isSameISODate(e.start_time_utc, iso)) || [];

  return (
    <div
      className="day-cell"
      role="button"
      tabIndex={0}
      onClick={() => onDayClick?.(iso)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onDayClick?.(iso);
      }}
      title={iso}
    >
      <div className="day-number">{date.getDate()}</div>

      <div className="day-events">
        {dayEvents.slice(0, 3).map((ev: any) => (
          <div key={ev.id} className="event-chip">
            {ev.title}
          </div>
        ))}
        {dayEvents.length > 3 && (
          <div className="event-more">+{dayEvents.length - 3} more</div>
        )}
      </div>
    </div>
  );
}
