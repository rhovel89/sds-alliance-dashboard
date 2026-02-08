export default function DayCell({ date, events, timezone, onDayClick }: any) {
  const iso = date.toISOString().split('T')[0];

  return (
    <div
      className='calendar-day'
      onClick={() => onDayClick(iso)}
      style={{
        border: '1px solid red',
        padding: '12px',
        cursor: 'pointer',
        userSelect: 'none'
      }}
    >
      <div className='day-number'>{date.getDate()}</div>
    </div>
  );
}

