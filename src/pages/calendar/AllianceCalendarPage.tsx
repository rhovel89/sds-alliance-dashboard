import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";

export default function AllianceCalendarPage() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = (alliance_id || "").toUpperCase();

  const { canEdit } = useHQPermissions(upperAlliance);

  const [events, setEvents] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const refetch = async () => {
    if (!upperAlliance) return;

    const { data, error } = await supabase
      .from("alliance_events")
      .select("*")
      .eq("alliance_id", upperAlliance);

    if (!error && data) {
      setEvents(data);
    }
  };

  useEffect(() => {
    refetch();
  }, [upperAlliance]);

  // ===============================
  // RECURRING ENGINE
  // ===============================
  const expandRecurringEvents = (events: any[], month: number, year: number) => {
    const expanded: any[] = [];

    events.forEach((event) => {
      const start = new Date(event.start_date);
      const end = new Date(event.end_date);

      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const current = new Date(year, month, day);

        if (current < start || current > end) continue;

        if (!event.recurrence_type || event.recurrence_type === "none") {
          if (current.toDateString() === start.toDateString()) {
            expanded.push({ ...event, instanceDate: current });
          }
        }

        if (event.recurrence_type === "daily") {
          expanded.push({ ...event, instanceDate: current });
        }

        if (event.recurrence_type === "weekly" && event.recurrence_days) {
          const weekday = current.getDay();
          if (event.recurrence_days.includes(weekday)) {
            expanded.push({ ...event, instanceDate: current });
          }
        }

        if (event.recurrence_type === "monthly") {
          if (current.getDate() === start.getDate()) {
            expanded.push({ ...event, instanceDate: current });
          }
        }
      }
    });

    return expanded;
  };

  const expandedEvents = useMemo(() => {
    return expandRecurringEvents(events, currentMonth, currentYear);
  }, [events, currentMonth, currentYear]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  return (
    <div style={{ padding: 24, color: "#b6ff9e" }}>
      <h1>📅 Alliance Calendar — {upperAlliance}</h1>

      {canEdit && (
        <button
          onClick={() => setShowModal(true)}
          style={{
            marginTop: 12,
            padding: "8px 14px",
            borderRadius: 8,
            background: "rgba(0,255,0,0.15)",
            border: "1px solid rgba(0,255,0,0.5)",
            color: "#8aff8a",
            cursor: "pointer"
          }}
        >
          ➕ Create Event
        </button>
      )}

      <div style={{
        marginTop: 24,
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 8
      }}>
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;

          const dayEvents = expandedEvents.filter(e =>
            new Date(e.instanceDate).getDate() === day
          );

          return (
            <div
              key={day}
              style={{
                minHeight: 100,
                border: "1px solid rgba(0,255,0,0.2)",
                padding: 6,
                borderRadius: 8
              }}
            >
              <div style={{ fontWeight: 700 }}>{day}</div>

              {dayEvents.map((ev, i) => (
                <div
                  key={i}
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    background: "rgba(0,255,0,0.08)",
                    padding: 4,
                    borderRadius: 4
                  }}
                >
                  {ev.event_name}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

