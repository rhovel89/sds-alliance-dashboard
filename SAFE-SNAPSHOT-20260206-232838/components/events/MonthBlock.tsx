type Props = {
  events?: any[];
  onCreate?: (dateIso: string) => void;
  onEventClick?: (ev: any) => void;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isoDate(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return ${d.getFullYear()}--;
}

export default function MonthBlock({ events = [], onCreate, onEventClick }: Props) {
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth();

  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);

  const firstDow = first.getDay();
  const daysInMonth = last.getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIndex, d));

  // Map events to day bucket
  const byDay = new Map<string, any[]>();
  for (const ev of events) {
    const dIso =
      ev?.event_date ||
      (ev?.startDate instanceof Date ? isoDate(ev.startDate) : null);

    if (!dIso) continue;
    if (!byDay.has(dIso)) byDay.set(dIso, []);
    byDay.get(dIso)!.push(ev);
  }

  const monthTitle = now.toLocaleString("default", { month: "long" });

  return (
    <div className="month-block">
      <div className="month-title">
        {monthTitle} {year}
      </div>

      <div className="weekday-row">
        {WEEKDAYS.map((w) => (
          <div key={w} className="weekday">{w}</div>
        ))}
      </div>

      <div className="month-grid">
        {cells.map((cell, idx) => {
          if (!cell) return <div key={idx} className="day-cell blank" />;

          const dIso = isoDate(cell);
          const list = byDay.get(dIso) || [];

          return (
            <div
              key={idx}
              className="day-cell"
              onClick={() => onCreate?.(dIso)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onCreate?.(dIso);
              }}
            >
              <div className="day-num">{cell.getDate()}</div>

              <div className="day-events">
                {list.slice(0, 3).map((ev, i) => (
                  <div
                    key={ev?.id || i}
                    className="event-pill"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(ev);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        onEventClick?.(ev);
                      }
                    }}
                    title={ev?.title || ev?.event_name || "Event"}
                  >
                    {ev?.title || ev?.event_name || "Event"}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
