import DayCell from './DayCell';

export default function MonthBlock({ month, events, onDayClick }: any) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIndex, d));

  return (
    <div style={{ marginBottom: 40 }}>
      <h3>
        {month.toLocaleString('default', { month: 'long' })} {year}
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {cells.map((d, i) =>
          d ? (
            <DayCell
              key={i}
              date={d}
              events={events}
              onClick={onDayClick}
            />
          ) : (
            <div key={i} />
          )
        )}
      </div>
    </div>
  );
}
