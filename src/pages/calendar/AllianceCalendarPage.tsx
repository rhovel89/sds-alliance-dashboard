import { useParams } from "react-router-dom";
import { useState } from "react";
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

      <p>Alliance calendar system initializing...</p>
    </div>
  );
}
