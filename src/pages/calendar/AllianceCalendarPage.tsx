import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";

type EventRow = {
  id: string;
  alliance_id: string;
  title: string;
  event_type: string | null;
  start_time_utc: string;
  duration_minutes: number;
  created_by: string;
};

const EVENT_TYPES = [
  "State vs. State",
  "Reminder",
  "Sonic",
  "Dead Rising",
  "Defense of Alliance",
  "Wasteland King",
  "Valiance Conquest",
  "Tundra",
  "Alliance Clash",
  "Alliance Showdown",
  "FireFlies",
];

export default function AllianceCalendarPage() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = (alliance_id || "").toUpperCase();
  const { canEdit } = useHQPermissions(upperAlliance);

  const [userId, setUserId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    title: "",
    event_type: "State vs. State",
    start_date: "",
    start_time: "",
    end_date: "",
    end_time: "",
  });

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const daysInMonth = useMemo(
    () => new Date(year, month + 1, 0).getDate(),
    [month, year]
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id ?? null);
    })();
  }, []);

  const refetch = async () => {
    if (!upperAlliance) return;

    const { data } = await supabase
      .from("alliance_events")
      .select("*")
      .eq("alliance_id", upperAlliance)
      .order("start_time_utc", { ascending: true });

    setEvents((data || []) as EventRow[]);
  };

  useEffect(() => {
    refetch();
  }, [upperAlliance]);

  const saveEvent = async () => {
    if (!canEdit) return;
    if (!userId) return alert("User session missing.");

    if (!form.title || !form.start_date || !form.start_time || !form.end_date || !form.end_time) {
      return alert("All fields required.");
    }

    const startLocal = new Date(`${form.start_date}T${form.start_time}:00`);
    const endLocal = new Date(`${form.end_date}T${form.end_time}:00`);

    if (endLocal <= startLocal) {
      return alert("End time must be after start time.");
    }

    const durationMinutes = Math.round(
      (endLocal.getTime() - startLocal.getTime()) / 60000
    );

    const payload = {
  alliance_id: upperAlliance,

  // REQUIRED NOT NULL COLUMNS
  title: title,
  created_by: userId,
  start_time_utc: startLocal.toISOString(),
  duration_minutes: durationMinutes,
  timezone_origin: Intl.DateTimeFormat().resolvedOptions().timeZone,

  // Optional display fields
  event_name: title,
  event_type: form.event_type,
  start_date: form.start_date,
  end_date: form.end_date,
  start_time: form.start_time,
  end_time: form.end_time
};

    const { error } = await supabase.from("alliance_events").insert(payload);

    if (error) {
      alert(error.message);
      return;
    }

    setShowModal(false);
    setForm({
      title: "",
      event_type: "State vs. State",
      start_date: "",
      start_time: "",
      end_date: "",
      end_time: "",
    });

    await refetch();
  };

  const deleteEvent = async (id: string) => {
    if (!canEdit) return;
    if (!confirm("Delete this event?")) return;

    await supabase.from("alliance_events").delete().eq("id", id);
    await refetch();
  };

  return (
    <div style={{ padding: 24, color: "#cfffbe" }}>
      <h2>📅 Alliance Calendar — {upperAlliance}</h2>

      {canEdit && (
        <button className="zombie-btn" onClick={() => setShowModal(true)}>
          ➕ Create Event
        </button>
      )}

      <div
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 10,
        }}
      >
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;

          const dayEvents = events.filter((e) => {
            const local = new Date(e.start_time_utc);
            return (
              local.getFullYear() === year &&
              local.getMonth() === month &&
              local.getDate() === day
            );
          });

          return (
            <div
              key={day}
              style={{
                border: "1px solid rgba(0,255,0,0.2)",
                borderRadius: 10,
                padding: 10,
                minHeight: 120,
              }}
            >
              <div style={{ fontWeight: 700 }}>{day}</div>

              {dayEvents.map((e) => (
                <div
                  key={e.id}
                  style={{
                    marginTop: 6,
                    padding: 6,
                    borderRadius: 6,
                    background: "rgba(0,255,0,0.15)",
                    cursor: canEdit ? "pointer" : "default",
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

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div style={{ background: "#111", padding: 20, borderRadius: 12 }}>
            <h3>Create Event</h3>

            <input
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />

            <select
              value={form.event_type}
              onChange={(e) => setForm({ ...form, event_type: e.target.value })}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>

            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
            <input
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            />

            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
            <input
              type="time"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            />

            <button onClick={saveEvent}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}


