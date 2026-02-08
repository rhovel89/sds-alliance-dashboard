import DayCell from './DayCell';

export default function MonthBlock({ month, events, timezone, onDayClick }: any) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  return (
    <div className='month-block'>
      <div className='month-title'>
        {month.toLocaleString('default', { month: 'long' })} {year}
      </div>

      <div className='month-grid'>
        {Array.from({ length: daysInMonth }, (_, i) => (
          <DayCell
            key={i}
            date={new Date(year, monthIndex, i + 1)}
            events={events}
            timezone={timezone}
            onDayClick={onDayClick}
          />
        ))}
      </div>
    </div>
  );
}

