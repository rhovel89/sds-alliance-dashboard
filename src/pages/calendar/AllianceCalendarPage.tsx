import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type CalendarEvent = {
  id: string;
  alliance_id: string;
  title: string;
  start_date: string;
  end_date: string;
};

export default function AllianceCalendarPage() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = (alliance_id || "").toUpperCase();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!upperAlliance) return;

    const load = async () => {
      const { data } = await supabase
        .from("alliance_events")
        .select("*")
        .eq("alliance_id", upperAlliance)
        .order("start_date", { ascending: true });

      if (data) setEvents(data as CalendarEvent[]);
      setLoading(false);
    };

    load();
  }, [upperAlliance]);

  if (!upperAlliance) {
    return <div style={{ padding: 24 }}>Missing alliance in URL.</div>;
  }

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const daysArray = [];

  for (let i = 0; i < startDayOfWeek; i++) {
    daysArray.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    daysArray.push(day);
  }

  return (
    <div style={{ padding: 24, color: "#b6ff9e" }}>
      <h2 style={{ marginBottom: 20 }}>
        📅 {upperAlliance} — {today.toLocaleString("default", { month: "long" })} {year}
      </h2>

      {loading && <div>Loading...</div>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 10
        }}
      >
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} style={{ fontWeight: 700 }}>{d}</div>
        ))}

        {daysArray.map((day, index) => {
          const dayEvents = events.filter(e => {
            if (!day) return false;
            const eventDate = new Date(e.start_date);
            return (
              eventDate.getDate() === day &&
              eventDate.getMonth() === month &&
              eventDate.getFullYear() === year
            );
          });

          return (
            <div
              key={index}
              style={{
                minHeight: 100,
                borderRadius: 12,
                background: "rgba(0,0,0,0.4)",
                padding: 8,
                border: "1px solid rgba(0,255,0,0.2)"
              }}
            >
              {day && <div style={{ fontWeight: 600 }}>{day}</div>}

              {dayEvents.map(ev => (
                <div
                  key={ev.id}
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    background: "rgba(0,255,0,0.1)",
                    padding: 4,
                    borderRadius: 6
                  }}
                >
                  {ev.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
