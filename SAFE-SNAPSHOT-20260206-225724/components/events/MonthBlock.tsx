import DayCell from "./DayCell";

const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function MonthBlock({ events = [], onCreate, onEventClick }: any) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = firstDay.getDay();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }

  return (
    <div className="month-block">
      <div className="month-title">
        {today.toLocaleString("default", { month: "long" })} {year}
      </div>

      <div className="weekday-row">
        {WEEKDAYS.map(w => <div key={w}>{w}</div>)}
      </div>

      <div className="month-grid">
        {cells.map((date, i) => (
          <DayCell
            key={i}
            date={date}
            events={events}
            onCreate={onCreate}
            onEventClick={onEventClick}
          />
        ))}
      </div>
    </div>
  );
}
