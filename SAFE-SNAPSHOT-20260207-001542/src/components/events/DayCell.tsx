type Props = {
  date: Date | null;
  events: any[];
  onCreate: (dateStr: string) => void;
  onEventClick: (event: any) => void;
};

export default function DayCell({ date, events = [], onCreate, onEventClick }: Props) {
  if (!date) {
    return <div className="day-cell day-cell-empty" />;
  }

  const dateStr = date.toISOString().slice(0, 10);

  const dayEvents = (events || []).filter((e: any) => {
    const ed = e?.event_date;
    return typeof ed === "string" && ed.slice(0, 10) === dateStr;
  });

  return (
    <div
      className="day-cell"
      role="button"
      tabIndex={0}
      onClick={() => onCreate(dateStr)}
      onKeyDown={(ev) => {
        if (ev.key === "Enter" || ev.key === " ") onCreate(dateStr);
      }}
      style={{ cursor: "pointer" }}
    >
      <div className="day-number">{date.getDate()}</div>

      <div className="day-events">
        {dayEvents.map((ev: any) => (
          <div
            key={ev.id || ev.start_time_utc || ev.event_name}
            className="day-event"
            onClick={(e) => {
              e.stopPropagation();
              onEventClick(ev);
            }}
            role="button"
            tabIndex={0}
          >
            {ev.event_name || ev.title || "Event"}
          </div>
        ))}
      </div>
    </div>
  );
}
