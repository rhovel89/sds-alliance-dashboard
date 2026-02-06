type Props = {
  date: Date;
  isOutside?: boolean;
  events?: any[];
  onClick?: (isoDate: string) => void;
};

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DayCell({ date, isOutside, events = [], onClick }: Props) {
  const iso = toISODate(date);
  const dayEvents = events.filter((e) => e?.__uiDate === iso);

  return (
    <div
      className={`day-cell ${isOutside ? "is-outside" : ""}`}
      onClick={() => onClick?.(iso)}
      role="button"
      tabIndex={0}
    >
      <div className="day-num">{date.getDate()}</div>

      {dayEvents.slice(0, 3).map((e: any) => (
        <span key={e.id ?? `${e.title}-${e.start_time_utc}`} className="event-chip">
          {e.title}
        </span>
      ))}

      {dayEvents.length > 3 ? (
        <span className="event-chip">+{dayEvents.length - 3} more</span>
      ) : null}
    </div>
  );
}
