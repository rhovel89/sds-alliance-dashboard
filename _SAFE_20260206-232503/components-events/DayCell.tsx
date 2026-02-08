type Props = {
  date: Date | null;
  events: any[];
  onClick?: (dateStr: string) => void;
  onEventClick?: (ev: any) => void;
};

function toDateKeyLocal(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return ${yyyy}--;
}

export default function DayCell({ date, events, onClick, onEventClick }: Props) {
  if (!date) return <div className="day-cell day-cell--empty" />;

  const key = toDateKeyLocal(date);
  const dayEvents = (events || []).filter((e) => e?.event_date === key);

  return (
    <div
      className="day-cell"
      onClick={() => onClick?.(key)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.(key);
      }}
    >
      <div className="day-num">{date.getDate()}</div>

      <div className="day-events">
        {dayEvents.slice(0, 3).map((ev) => (
          <div
            key={ev.id || ev.title}
            className="day-event"
            onClick={(e) => {
              e.stopPropagation();
              onEventClick?.(ev);
            }}
            role="button"
            tabIndex={0}
          >
            {ev.title}
          </div>
        ))}
        {dayEvents.length > 3 ? (
          <div className="day-event day-event--more">+{dayEvents.length - 3} more</div>
        ) : null}
      </div>
    </div>
  );
}
