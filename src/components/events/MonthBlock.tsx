import DayCell from "./DayCell";

type Props = {
  month: Date;
  events: any[];
  onDayClick?: (isoDate: string) => void;
};

function startOfMonthGrid(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1);
  const startDow = first.getDay(); // 0=Sun
  const start = new Date(year, monthIndex, 1 - startDow);
  return start;
}

export default function MonthBlock({ month, events, onDayClick }: Props) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  const monthName = month.toLocaleString("default", { month: "long" });
  const gridStart = startOfMonthGrid(year, monthIndex);

  // 6 weeks x 7 days = 42 cells (standard month view)
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  const weekdays = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  return (
    <div className="month-block">
      <div className="month-title">{monthName} {year}</div>

      <div className="weekday-header">
        {weekdays.map((w) => <div key={w}>{w}</div>)}
      </div>

      <div className="month-grid">
        {cells.map((d) => (
          <DayCell
            key={d.toISOString()}
            date={d}
            isOutside={d.getMonth() !== monthIndex}
            events={events}
            onClick={onDayClick}
          />
        ))}
      </div>
    </div>
  );
}
