import DayCell from "./DayCell";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MonthBlock({ month, events, onDayClick }: any) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  const first = new Date(year, monthIndex, 1);
  const firstWeekday = first.getDay(); // 0..6 (Sun..Sat)
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIndex, d));
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="month-block">
      <div className="month-title">
        {month.toLocaleString("default", { month: "long" })} {year}
      </div>

      <div className="weekday-row">
        {WEEKDAYS.map((w) => (
          <div key={w} className="weekday-cell">
            {w}
          </div>
        ))}
      </div>

      <div className="month-grid">
        {cells.map((cell, idx) => (
          <DayCell
            key={idx}
            date={cell}
            events={events}
            onDayClick={onDayClick}
          />
        ))}
      </div>
    </div>
  );
}
