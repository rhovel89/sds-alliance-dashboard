import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";

type EventItem = {
  id: string;
  event_name: string;
  event_type: string;
  start_date: string;
  end_date: string;
};

export default function AllianceCalendarPage() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = (alliance_id || "").toUpperCase();
  const { canEdit } = useHQPermissions(upperAlliance);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    title: "",
    event_type: "State vs. State",
    start_at: "",
    end_at: "",
  });

  // -----------------------
  // FETCH EVENTS
  // -----------------------
  const refetch = async () => {
    if (!upperAlliance) return;

    const { data, error } = await supabase
      .from("alliance_events")
      .select("*")
      .eq("alliance_id", upperAlliance);

    if (error) {
      console.error("FETCH EVENTS ERROR:", error);
      return;
    }

    setEvents(data || []);
  };

  useEffect(() => {
    refetch();
  }, [upperAlliance]);

  // -----------------------
  // SAVE EVENT
  // -----------------------
    const saveEvent = async () => {
    if (!upperAlliance) return;

    if (!form.title || !form.start_at || !form.end_at) {
      alert("Please complete all required fields.");
      return;
    }

    const start = new Date(form.start_at);
    const end = new Date(form.end_at);

    const payload = {
      alliance_id: upperAlliance,
      event_name: form.title,
      event_type: form.event_type,
      start_date: start.toISOString().split("T")[0],
      end_date: end.toISOString().split("T")[0],
      start_time: start.toTimeString().split(" ")[0],
      end_time: end.toTimeString().split(" ")[0],
    };

    const { error } = await supabase
      .from("alliance_events")
      .insert(payload);

    if (error) {
      console.error("SAVE EVENT ERROR:", error);
      alert(error.message);
      return;
    }

    setShowModal(false);
    await refetch(); // auto refresh calendar
    alert("Event Created Successfully");
  };

  // -----------------------
  // DELETE EVENT
  // -----------------------
  const deleteEvent = async (id: string) => {
    if (!canEdit) return;

    if (!confirm("Delete this event?")) return;

    await supabase.from("alliance_events").delete().eq("id", id);
    await refetch();
  };

  // -----------------------
  // MONTH GRID
  // -----------------------
  const today = new Date();
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  ).getDate();

  return (
    <div style={{ padding: 24 }}>
      <h2>📅 Alliance Calendar — {upperAlliance}</h2>

      {canEdit && (
        <button
          className="zombie-btn"
          onClick={() => setShowModal(true)}
          style={{ marginBottom: 16 }}
        >
          ➕ Create Event
        </button>
      )}

      {/* MONTH GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 10,
        }}
      >
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;

          const dayEvents = events.filter(
            (e) => new Date(e.start_date).getDate() === day
          );

          return (
            <div
              key={day}
              style={{
                minHeight: 100,
                padding: 8,
                borderRadius: 8,
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(0,255,0,0.2)",
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>
                {day}
              </div>

              {dayEvents.map((e) => (
                <div
                  key={e.id}
                  style={{
                    background: "rgba(0,255,0,0.15)",
                    padding: "4px 6px",
                    borderRadius: 6,
                    fontSize: 12,
                    marginTop: 4,
                    cursor: canEdit ? "pointer" : "default",
                  }}
                  onClick={() => deleteEvent(e.id)}
                >
                  {e.event_name}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* MODAL */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#111",
              padding: 24,
              borderRadius: 12,
              width: 400,
              boxShadow: "0 0 25px rgba(0,255,0,0.2)",
            }}
          >
            <h3>Create Event</h3>

            <input
              placeholder="Event Title"
              value={form.title}
              onChange={(e) =>
                setForm({ ...form, title: e.target.value })
              }
              style={{ width: "100%", marginBottom: 12 }}
            />

            <select
              value={form.event_type}
              onChange={(e) =>
                setForm({ ...form, event_type: e.target.value })
              }
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
              onChange={(e) =>
                setForm({ ...form, start_at: e.target.value })
              }
              style={{ width: "100%", marginBottom: 12 }}
            />

            <input
              type="datetime-local"
              value={form.end_at}
              onChange={(e) =>
                setForm({ ...form, end_at: e.target.value })
              }
              style={{ width: "100%", marginBottom: 12 }}
            />

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setShowModal(false)}>
                Cancel
              </button>

              <button
                className="zombie-btn"
                onClick={saveEvent}
              >
                Save Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

