import DayCell from "./DayCell";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Props = {
  date: Date;
  events: any[];
  onCreate: (date: string) => void;
  onEventClick: (event: any) => void;
};

export default function MonthBlock({ date, events, onCreate, onEventClick }: Props) {
  const year = date.getFullYear();
  const monthIndex = date.getMonth();

  const firstDow = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, monthIndex, d));
  }

  return (
    <div className="month-block">
      <h2 className="month-title">
        {date.toLocaleString("default", { month: "long" })} {year}
      </h2>

      <div className="weekday-row">
        {WEEKDAYS.map(w => (
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
