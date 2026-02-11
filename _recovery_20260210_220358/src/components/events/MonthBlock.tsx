import DayCell from "./DayCell";

export default function MonthBlock({ events, onDayClick }: any) {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="month-grid">
      {days.map((day) => (
        <DayCell
          key={day}
          day={day}
          events={events.filter((e: any) => new Date(e.date).getDate() === day)}
          onClick={() => onDayClick(day)}
        />
      ))}
    </div>
  );
}
