import DayCell from "./DayCell";

const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

type Props = {
  monthDate: Date;
  events: any[];
  onCreate: (dateStr: string) => void;
  onEventClick: (event: any) => void;
};

export default function MonthBlock({ monthDate, events = [], onCreate, onEventClick }: Props) {
  const safeMonth = monthDate instanceof Date && !isNaN(monthDate.getTime()) ? monthDate : new Date();

  const year = safeMonth.getFullYear();
  const monthIndex = safeMonth.getMonth();

  const firstOfMonth = new Date(year, monthIndex, 1);
  const firstDow = firstOfMonth.getDay(); // 0..6
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIndex, d));

  const monthName = safeMonth.toLocaleString("default", { month: "long" });

  return (
    <div className="month-block">
      <div className="month-title">
        {monthName} {year}
      </div>

      <div className="weekday-row">
        {WEEKDAYS.map((w) => (
          <div key={w} className="weekday">{w}</div>
        ))}
      </div>

      <div className="month-grid">
        {cells.map((cell, idx) => (
          <DayCell
            key={idx}
            date={cell}
            events={events}
            onCreate={onCreate}
            onEventClick={onEventClick}
          />
        ))}
      </div>
    </div>
  );
}
