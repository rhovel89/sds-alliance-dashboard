
//////////////////////////////////////////////////////////////
// 🔁 Recurring Event Engine (SAFE — no existing logic touched)
//////////////////////////////////////////////////////////////

type CalendarEvent = {
  id: string;
  event_name: string;
  start_date: string;
  end_date: string | null;
  recurrence_type: string | null;
  recurrence_days: string[] | null;
};

const expandRecurringEvent = (
  event: CalendarEvent,
  monthStart: Date,
  monthEnd: Date
) => {
  const occurrences: Date[] = [];

  const start = new Date(event.start_date);
  const end = event.end_date ? new Date(event.end_date) : monthEnd;

  const current = new Date(monthStart);

  while (current <= monthEnd) {
    if (current < start || current > end) {
      current.setDate(current.getDate() + 1);
      continue;
    }

    const dayName = current.toLocaleDateString("en-US", { weekday: "long" });

    if (!event.recurrence_type) {
      if (
        current.toDateString() === start.toDateString()
      ) {
        occurrences.push(new Date(current));
      }
    }

    if (event.recurrence_type === "daily") {
      occurrences.push(new Date(current));
    }

    if (event.recurrence_type === "weekly") {
      if (event.recurrence_days?.includes(dayName)) {
        occurrences.push(new Date(current));
      }
    }

    if (event.recurrence_type === "biweekly") {
      const diffDays = Math.floor(
        (current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays % 14 === 0) {
        occurrences.push(new Date(current));
      }
    }

    if (event.recurrence_type === "monthly") {
      if (current.getDate() === start.getDate()) {
        occurrences.push(new Date(current));
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return occurrences;
};

//////////////////////////////////////////////////////////////

import { useParams } from "react-router-dom";

import { useState } from "react";
import { useHQPermissions } from "../../hooks/useHQPermissions";
import EventModal from "../../components/calendar/EventModal";
import { useHQPermissions } from "../../hooks/useHQPermissions";


type CreateEventPayload = {
  title: string;
  event_type: string;
  start_at: string;
  end_at: string;
};

export default function AllianceCalendarPage() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = (alliance_id || "").toUpperCase();
  const { canEdit } = useHQPermissions(upperAlliance);
  const [showModal, setShowModal] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState<CreateEventPayload>({
    title: "",
    event_type: "State vs. State",
    start_at: "",
    end_at: "",
  });

  return (
    <div style={{ padding: 24 }}>
      <h2>📅 Alliance Calendar — {upperAlliance}</h2>

     {canEdit && (
          <button onClick={() => setShowModal(true)}>
           ➕ Create Event
         </button>
      )}


      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000
          }}
        >
          <div
            style={{
              background: "#111",
              padding: 24,
              borderRadius: 12,
              width: 400,
              boxShadow: "0 0 25px rgba(0,255,0,0.2)"
            }}
          >
            <h3>Create Event</h3>

            <input
              placeholder="Event Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={{ width: "100%", marginBottom: 12 }}
            />

            <select
              value={form.event_type}
              onChange={(e) => setForm({ ...form, event_type: e.target.value })}
              style={{ width: "100%", marginBottom: 12 }}
            >
              <option>State vs. State</option>
              <option>Sonic</option>
              <option>Dead Rising</option>
              <option>Defense of Alliance</option>
              <option>Wasteland King</option>
              <option>Valiance Conquest</option>
              <option>Tundra</option>
              <option>Alliance Clash</option>
              <option>Alliance Showdown</option>
              <option>FireFlies</option>
            </select>

            <input
              type="datetime-local"
              value={form.start_at}
              onChange={(e) => setForm({ ...form, start_at: e.target.value })}
              style={{ width: "100%", marginBottom: 12 }}
            />

            <input
              type="datetime-local"
              value={form.end_at}
              onChange={(e) => setForm({ ...form, end_at: e.target.value })}
              style={{ width: "100%", marginBottom: 12 }}
            />

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="zombie-btn">
                Save Event
              </button>
      
             <EventModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={(data) => {
                console.log("Event Created:", data);
             }}
             />
            </div>
          </div>
        </div>
      )}

      <p>Alliance calendar system initializing...</p>
    </div>
  );
}








  // ===============================
  // RECURRING ENGINE (SAFE ADD)
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
          if (
            current.toDateString() === start.toDateString()
          ) {
            expanded.push({ ...event, instanceDate: current });
          }
        }

        if (event.recurrence_type === "daily") {
          expanded.push({ ...event, instanceDate: current });
        }

        if (event.recurrence_type === "weekly" && event.recurrence_days) {
          const weekday = current.getDay(); // 0-6
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




