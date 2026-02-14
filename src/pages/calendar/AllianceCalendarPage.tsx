import { useParams } from "react-router-dom";
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
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

  const [form, setForm] = useState<CreateEventPayload>({
    title: "",
    event_type: "State vs. State",
    start_at: "",
    end_at: "",
  });

  
  // ===== SAVE_EVENT_HANDLER =====
  const handleSaveEvent = async () => {
    if (!form.title || !form.start_at) {
      alert("Title and Start Date required");
      return;
    }

    const payload = {
      alliance_id: upperAlliance,
      event_name: form.title,
      event_type: form.event_type,
      start_date: form.start_at.split("T")[0],
      end_date: form.end_at ? form.end_at.split("T")[0] : form.start_at.split("T")[0],
      start_time: form.start_at.split("T")[1],
      end_time: form.end_at ? form.end_at.split("T")[1] : null
    };

    const { error } = await supabase
      .from("alliance_events")
      .insert(payload);

    if (error) {
      console.error(error);
      alert("Failed to save event");
      return;
    }

    setShowModal(false);
    alert("Event saved!");
  };
  // ===== SAVE_EVENT_HANDLER_END =====

  
  const saveEvent = async () => {
    if (!upperAlliance) return;

    if (!form.title || !form.start_at || !form.end_at) {
      alert("Please complete all required fields.");
      return;
    }

    const { error } = await supabase
      .from("alliance_events")
      .insert({
        alliance_id: upperAlliance,
        event_name: form.title,
        event_type: form.event_type,
        start_date: form.start_at,
        end_date: form.end_at,
      });

    if (error) {
      console.error("SAVE EVENT ERROR:", error);
      alert("Failed to save event");
      return;
    }

    setShowModal(false);
    alert("Event Created Successfully");
  };

return (
    <div style={{ padding: 24 }}>
      <h2>📅 Alliance Calendar — {upperAlliance}</h2>

      {canEdit && (
        <button
          className="zombie-btn"
          style={{ marginBottom: 16 }}
          onClick={() => setShowModal(true)}
        >
          ➕ Create Event
        </button>
      )}

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
              width: 420,
              boxShadow: "0 0 25px rgba(0,255,0,0.2)",
              color: "#b6ff9e",
            }}
          >
            <h3 style={{ marginBottom: 16 }}>Create Event</h3>

            <input
              placeholder="Event Title"
              value={form.title}
              onChange={(e) =>
                setForm({ ...form, title: e.target.value })
              }
              style={{
                width: "100%",
                marginBottom: 12,
                padding: 8,
                borderRadius: 6,
              }}
            />

            <select
              value={form.event_type}
              onChange={(e) =>
                setForm({ ...form, event_type: e.target.value })
              }
              style={{
                width: "100%",
                marginBottom: 12,
                padding: 8,
                borderRadius: 6,
              }}
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

            <label style={{ fontSize: 12 }}>Start</label>
            <input
              type="datetime-local"
              value={form.start_at}
              onChange={(e) =>
                setForm({ ...form, start_at: e.target.value })
              }
              style={{
                width: "100%",
                marginBottom: 12,
                padding: 8,
                borderRadius: 6,
              }}
            />

            <label style={{ fontSize: 12 }}>End</label>
            <input
              type="datetime-local"
              value={form.end_at}
              onChange={(e) =>
                setForm({ ...form, end_at: e.target.value })
              }
              style={{
                width: "100%",
                marginBottom: 16,
                padding: 8,
                borderRadius: 6,
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <button onClick={() => setShowModal(false)}>
                Cancel
              </button>

              <button
                className="zombie-btn"
                onClick={() => {
                  console.log("Event Created:", form);
                  setShowModal(false);
                }}
              >
                Save Event
              </button>
            </div>
          </div>
        </div>
      )}

      
      {/* ===== Calendar Grid START ===== */}
      <div
        style={{
          marginTop: 30,
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 8,
          maxWidth: 900
        }}
      >
        {Array.from({ length: 35 }).map((_, i) => {
          const day = i + 1
          
  // ===== SAVE_EVENT_HANDLER =====
  const handleSaveEvent = async () => {
    if (!form.title || !form.start_at) {
      alert("Title and Start Date required");
      return;
    }

    const payload = {
      alliance_id: upperAlliance,
      event_name: form.title,
      event_type: form.event_type,
      start_date: form.start_at.split("T")[0],
      end_date: form.end_at ? form.end_at.split("T")[0] : form.start_at.split("T")[0],
      start_time: form.start_at.split("T")[1],
      end_time: form.end_at ? form.end_at.split("T")[1] : null
    };

    const { error } = await supabase
      .from("alliance_events")
      .insert(payload);

    if (error) {
      console.error(error);
      alert("Failed to save event");
      return;
    }

    setShowModal(false);
    alert("Event saved!");
  };
  // ===== SAVE_EVENT_HANDLER_END =====

  
  const saveEvent = async () => {
    if (!upperAlliance) return;

    if (!form.title || !form.start_at || !form.end_at) {
      alert("Please complete all required fields.");
      return;
    }

    const { error } = await supabase
      .from("alliance_events")
      .insert({
        alliance_id: upperAlliance,
        event_name: form.title,
        event_type: form.event_type,
        start_date: form.start_at,
        end_date: form.end_at,
      });

    if (error) {
      console.error("SAVE EVENT ERROR:", error);
      alert("Failed to save event");
      return;
    }

    setShowModal(false);
    alert("Event Created Successfully");
  };

return (
            <div
              key={i}
              style={{
                minHeight: 90,
                background: "#111",
                border: "1px solid rgba(0,255,0,0.2)",
                borderRadius: 8,
                padding: 6,
                fontSize: 12
              }}
            >
              <div style={{ opacity: 0.7 }}>{day <= 31 ? day : ""}</div>
            </div>
          )
        })}
      </div>
      {/* ===== Calendar Grid END ===== */}

      
      {/* ===== CALENDAR_GRID_START ===== */}
      <div
        style={{
          marginTop: 30,
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 12
        }}
      >
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: "rgba(0,0,0,0.45)",
              border: "1px solid rgba(0,255,0,0.25)",
              borderRadius: 12,
              padding: 12,
              minHeight: 80,
              color: "#b6ff9e"
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.6 }}>
              Day {i + 1}
            </div>
          </div>
        ))}
      </div>
      {/* ===== CALENDAR_GRID_END ===== */}

      <p>Alliance calendar system initializing...</p>
    </div>
  );
}






