import MonthBlock from "./MonthBlock";

export default function PlannerGrid({ events, timezone }: any) {
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now);
    d.setMonth(now.getMonth() + i);
    return d;
  });

  return (
    <div className="planner-grid">
      {months.map((month) => (
        <MonthBlock
          key={month.toISOString()}
          month={month}
          events={events}
          timezone={timezone}
        />
      ))}
    </div>
  );
}
