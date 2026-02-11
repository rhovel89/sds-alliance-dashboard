export default function DayCell({ day, events, onClick }: any) {
  return (
    <div className="day-cell" onClick={onClick}>
      <div className="day-number">{day}</div>
      {events.map((e: any) => (
        <div key={e.id} className="event-pill">
          {e.title}
        </div>
      ))}
    </div>
  );
}
