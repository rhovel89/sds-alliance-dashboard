export default function DayCell({ date, events, onClick }: any) {
  const iso = date.toISOString().slice(0, 10);
  const dayEvents = events.filter((e: any) => e.event_date === iso);

  return (
    <div
      className="calendar-day"
      style={{
        border: "1px solid #333",
        minHeight: 80,
        padding: 6,
        cursor: "pointer"
      }}
      onClick={() => onClick(iso)}
    >
      <div style={{ fontWeight: "bold" }}>{date.getDate()}</div>

      {dayEvents.map((e: any) => (
        <div key={e.id} style={{ fontSize: 12 }}>
          {e.title}
        </div>
      ))}
    </div>
  );
}
