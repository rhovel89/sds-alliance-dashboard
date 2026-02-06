type Props = {
  date: Date | null; // null = blank spacer cell
  events: any[];
  onClick?: (dateISO: string) => void;
};

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DayCell({ date, events, onClick }: Props) {
  if (!date) {
    return <div className="calendar-day is-empty" />;
  }

  const dateISO = isoDate(date);
  const dayEvents = (events || []).filter((e) => {
    // prefer event_date if present, fallback to start_time_utc
    const ed = e.event_date || (e.start_time_utc ? String(e.start_time_utc).slice(0, 10) : null);
    return ed === dateISO;
  });

  return (
    <div
      className="calendar-day"
      onClick={() => onClick && onClick(dateISO)}
      role="button"
      tabIndex={0}
    >
      <div className="day-number">{date.getDate()}</div>

      {dayEvents.slice(0, 3).map((ev: any) => (
        <div key={ev.id || `${ev.title}-${ev.start_time_utc}`} className="event-pill" title={ev.title}>
          {ev.title}
        </div>
      ))}

      {dayEvents.length > 3 && (
        <div className="event-pill" style={{ opacity: 0.8 }}>
          +{dayEvents.length - 3} more
        </div>
      )}
    </div>
  );
}
