import DayCell from "./DayCell";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MonthBlock({ events = [], onCreate, onEventClick }: any) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }

  return (
    <div className="month-block">
      <h2>
        {today.toLocaleString("default", { month: "long" })} {year}
      </h2>

      <div className="weekday-row">
        {WEEKDAYS.map(w => (
          <div key={w} className="weekday">{w}</div>
        ))}
      </div>

      <div className="month-grid">
        {cells.map((date, idx) => (
          <DayCell
            key={idx}
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

