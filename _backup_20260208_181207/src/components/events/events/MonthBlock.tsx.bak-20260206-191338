import DayCell from "./DayCell";

type Props = {
  month: Date;
  events: any[];
  onDayClick?: (dateISO: string) => void;
};

const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function MonthBlock({ month, events, onDayClick }: Props) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  const first = new Date(year, monthIndex, 1);
  const firstDow = first.getDay(); // 0=Sun
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  // Build cells with leading blanks so it aligns by weekday
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIndex, d));

  return (
    <div className="month-block">
      <div className="month-title">
        {month.toLocaleString("default", { month: "long" })} {year}
      </div>

      <div className="weekday-row">
        {WEEKDAYS.map((w) => (
          <div key={w} className="weekday">{w}</div>
        ))}
      </div>

      <div className="month-grid">
        {cells.map((cell, idx) => (
          <DayCell key={idx} date={cell} events={events} onClick={onDayClick} />
        ))}
      </div>
    </div>
  );
}
