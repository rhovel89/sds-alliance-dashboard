import DayCell from "./DayCell";

export default function MonthBlock({ month, events, onDayClick }: any) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  return (
    <div style={{ marginBottom: 40 }}>
      <h2>
        {month.toLocaleString("default", { month: "long" })} {year}
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4
        }}
      >
        {Array.from({ length: daysInMonth }, (_, i) => (
          <DayCell
            key={i}
            date={new Date(year, monthIndex, i + 1)}
            events={events}
            onClick={onDayClick}
          />
        ))}
      </div>
    </div>
  );
}
