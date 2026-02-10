export default function MonthBlock({ events }: any) {
  return (
    <div className="month-block">
      {events.map((e: any) => (
        <div key={e.id} className="event-row">
          <strong>{e.date}</strong> — {e.title}
        </div>
      ))}
    </div>
  );
}
