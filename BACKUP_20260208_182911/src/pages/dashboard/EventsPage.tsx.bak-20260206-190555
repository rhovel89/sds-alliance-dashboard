import { useState } from "react";
import MonthCalendar from "../../components/events/MonthCalendar";

export default function EventsPage() {
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth());

  return (
    <div style={{ padding: 20 }}>
      <h2>Events</h2>

      <MonthCalendar year={year} month={month} />
    </div>
  );
}
