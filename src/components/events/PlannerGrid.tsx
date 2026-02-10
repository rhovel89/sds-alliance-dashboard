import MonthBlock from "./MonthBlock";

export default function PlannerGrid({ events, onDayClick }: any) {
  return (
    <div className="planner-grid">
      <MonthBlock events={events} onDayClick={onDayClick} />
    </div>
  );
}
