import DayCell from "./DayCell";

const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

type Props = {
  date: Date;
  events: any[];
  onCreate: (date: string) => void;
  onEventClick: (event: any) => void;
};

export default function MonthBlock({ date, events, onCreate, onEventClick }: Props) {
  if (!(date instanceof Date)) return null;

  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const firstDow = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }

  return (
    <div className="month-block">
      <div className="month-title">
        {date.toLocaleString("default", { month: "long" })} {year}
      </div>

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
