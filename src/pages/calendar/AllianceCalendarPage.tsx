import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";

type CreateEventPayload = {
  title: string;
  event_type: string;
  start_date: string;
  end_date: string;
};

export default function AllianceCalendarPage() {

  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = (alliance_id || "").toUpperCase();

  const { canEdit } = useHQPermissions(upperAlliance);

  const [showModal, setShowModal] = useState(false);
  const [events, setEvents] = useState<any[]>([]);

  const [form, setForm] = useState<CreateEventPayload>({
    title: "",
    event_type: "State vs. State",
    start_date: "",
    end_date: "",
  });

  const refetch = async () => {
    if (!upperAlliance) return;

    const { data, error } = await supabase
      .from("alliance_events")
      .select("*")
      .eq("alliance_id", upperAlliance)
      .order("start_date", { ascending: true });

    if (error) {
      console.error("FETCH EVENTS ERROR:", error);
      return;
    }

    setEvents(data || []);
  };

  useEffect(() => {
    refetch();
  }, [upperAlliance]);

  const saveEvent = async () => {

    if (!form.title || !form.start_date || !form.end_date) {
      alert("Please complete all required fields.");
      return;
    }

    const { error } = await supabase
      .from("alliance_events")
      .insert({
        alliance_id: upperAlliance,
        event_name: form.title,
        event_type: form.event_type,
        start_date: form.start_date,
        end_date: form.end_date,
      });

    if (error) {
      console.error("SAVE EVENT ERROR:", error);
      alert("Failed to save event");
      return;
    }

    setShowModal(false);
    setForm({
      title: "",
      event_type: "State vs. State",
      start_date: "",
      end_date: "",
    });

    await refetch();
  };

  const deleteEvent = async (id: string) => {
    if (!canEdit) return;

    if (!confirm("Delete this event?")) return;

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
        <button onClick={() => setShowModal(true)}>
          ➕ Create Event
        </button>
      )}

      <div style={{ marginTop: 20 }}>
        {events.length === 0 && (
          <p>No events yet for this alliance.</p>
        )}

        {events.map(e => (
          <div
            key={e.id}
            style={{
              padding: 10,
              marginBottom: 8,
              background: "rgba(0,255,0,0.1)",
              borderRadius: 6
            }}
          >
            <strong>{e.event_name}</strong><br/>
            {e.event_type}<br/>
            {e.start_date} → {e.end_date}

            {canEdit && (
              <div style={{ marginTop: 6 }}>
                <button onClick={() => deleteEvent(e.id)}>
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

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
              type="date"
              value={form.start_date}
              onChange={(e) =>
                setForm({ ...form, start_date: e.target.value })
              }
              style={{ width: "100%", marginBottom: 12 }}
            />

            <input
              type="date"
              value={form.end_date}
              onChange={(e) =>
                setForm({ ...form, end_date: e.target.value })
              }
              style={{ width: "100%", marginBottom: 12 }}
            />

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setShowModal(false)}>
                Cancel
              </button>

              <button
                className="zombie-btn"
                onClick={canEdit ? saveEvent : undefined}
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
