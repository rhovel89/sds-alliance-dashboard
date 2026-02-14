import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";

type EventRecord = {
  id: string;
  alliance_id: string;
  title: string;
  event_type: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  created_by: string;
};

export default function AllianceCalendarPage() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = (alliance_id || "").toUpperCase();
  const { canEdit } = useHQPermissions(upperAlliance);

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    title: "",
    event_type: "State vs. State",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: ""
  });

  const today = new Date();
  const [month] = useState(today.getMonth());
  const [year] = useState(today.getFullYear());
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const refetch = async () => {
    if (!upperAlliance) return;

    const { data } = await supabase
      .from("alliance_events")
      .select("*")
      .eq("alliance_id", upperAlliance);

    if (data) setEvents(data as EventRecord[]);
  };

  useEffect(() => {
    refetch();
  }, [upperAlliance]);

  const saveEvent = async () => {
    if (!canEdit) return;

    if (
      !form.title ||
      !form.start_date ||
      !form.end_date ||
      !form.start_time ||
      !form.end_time
    ) {
      alert("Please fill all fields");
      return;
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Not authenticated");
      return;
    }

    const payload = {
      alliance_id: upperAlliance,
      title: form.title,               // REQUIRED
      event_name: form.title,          // keep compatibility
      event_type: form.event_type,
      start_date: form.start_date,
      end_date: form.end_date,
      start_time: form.start_time,
      end_time: form.end_time,
      created_by: user.id              // REQUIRED
    };

    const { error } = await supabase
      .from("alliance_events")
      .insert(payload);

    if (error) {
      console.error("SAVE ERROR:", error);
      alert(error.message);
      return;
    }

    setShowModal(false);
    setForm({
      title: "",
      event_type: "State vs. State",
      start_date: "",
      end_date: "",
      start_time: "",
      end_time: ""
    });

    await refetch();
  };

  const deleteEvent = async (id: string) => {
    if (!canEdit) return;
    if (!confirm("Delete event?")) return;

    await supabase
      .from("alliance_events")
      .delete()
      .eq("id", id);

    await refetch();
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>📅 Alliance Calendar — {upperAlliance}</h2>

      {canEdit && (
        <button
          className="zombie-btn"
          onClick={() => setShowModal(true)}
        >
          ➕ Create Event
        </button>
      )}

      {/* Month Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 10,
          marginTop: 20
        }}
      >
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;

          const dayEvents = events.filter(
            (e) =>
              new Date(e.start_date).getDate() === day &&
              new Date(e.start_date).getMonth() === month
          );

          return (
            <div
              key={day}
              style={{
                border: "1px solid rgba(0,255,0,0.3)",
                borderRadius: 10,
                padding: 10,
                minHeight: 100
              }}
            >
              <div style={{ fontWeight: 700 }}>{day}</div>

              {dayEvents.map((e) => (
                <div
                  key={e.id}
                  style={{
                    background: "rgba(0,255,0,0.15)",
                    marginTop: 6,
                    padding: 6,
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: canEdit ? "pointer" : "default"
                  }}
                  onClick={() => deleteEvent(e.id)}
                >
                  {e.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }}
        >
          <div
            style={{
              background: "#111",
              padding: 24,
              borderRadius: 12,
              width: 400
            }}
          >
            <h3>Create Event</h3>

            <input
              placeholder="Event Name"
              value={form.title}
              onChange={(e) =>
                setForm({ ...form, title: e.target.value })
              }
              style={{ width: "100%", marginBottom: 10 }}
            />

            <select
              value={form.event_type}
              onChange={(e) =>
                setForm({ ...form, event_type: e.target.value })
              }
              style={{ width: "100%", marginBottom: 10 }}
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
              type="date"
              value={form.start_date}
              onChange={(e) =>
                setForm({ ...form, start_date: e.target.value })
              }
              style={{ width: "100%", marginBottom: 10 }}
            />

            <input
              type="time"
              value={form.start_time}
              onChange={(e) =>
                setForm({ ...form, start_time: e.target.value })
              }
              style={{ width: "100%", marginBottom: 10 }}
            />

            <input
              type="date"
              value={form.end_date}
              onChange={(e) =>
                setForm({ ...form, end_date: e.target.value })
              }
              style={{ width: "100%", marginBottom: 10 }}
            />

            <input
              type="time"
              value={form.end_time}
              onChange={(e) =>
                setForm({ ...form, end_time: e.target.value })
              }
              style={{ width: "100%", marginBottom: 10 }}
            />

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setShowModal(false)}>Cancel</button>
              <button className="zombie-btn" onClick={saveEvent}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
