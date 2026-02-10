import MonthBlock from "./MonthBlock";

export default function PlannerGrid({ events }: any) {
  return (
    <div className="planner">
      <MonthBlock events={events} />
    </div>
  );
}
