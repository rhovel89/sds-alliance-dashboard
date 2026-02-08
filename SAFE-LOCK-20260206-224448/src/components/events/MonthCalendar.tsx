import React, { useState } from "react";
import EventModal from "./EventModal";
import "./calendar.css";

type Props = {
  year: number;
  month: number;
};

export default function MonthCalendar({ year, month }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <>
      <div className="calendar">
        <div className="calendar-header">
          {firstDay.toLocaleString("default", { month: "long", year: "numeric" })}
        </div>

        <div className="calendar-grid">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} className="calendar-day-label">{d}</div>
          ))}

          {cells.map((day, i) => (
            <div
              key={i}
              className={`calendar-cell ${day ? "" : "empty"}`}
              onClick={() => day && setSelectedDate(new Date(year, month, day))}
            >
              {day}
            </div>
          ))}
        </div>
      </div>

      <EventModal
        date={selectedDate}
        onClose={() => setSelectedDate(null)}
      />
    </>
  );
}
