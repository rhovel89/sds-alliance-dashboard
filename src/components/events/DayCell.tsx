export default function DayCell({ date, events, onClick }: any) {
  const iso = date.toISOString().split('T')[0];
  const dayEvents = events.filter((e: any) => e.__eventDate === iso);

  return (
    <div
      className="calendar-day"
      onClick={() => onClick(iso)}
      style={{
        border: '1px solid #333',
        padding: 6,
        minHeight: 80,
        cursor: 'pointer'
      }}
    >
      <div style={{ fontWeight: 'bold' }}>{date.getDate()}</div>

      {dayEvents.map((e: any) => (
        <div
          key={e.id}
          style={{
            marginTop: 4,
            padding: '2px 4px',
            background: '#1e1e1e',
            color: '#9cff9c',
            fontSize: 12,
            borderRadius: 4
          }}
        >
          {e.title}
        </div>
      ))}
    </div>
  );
}
