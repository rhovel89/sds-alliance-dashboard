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
  const [loading, setLoading] = useState(true);
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

  // ===============================
  // LOAD USER
  // ===============================
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id ?? null);
    })();
  }, []);

  // ===============================
  // LOAD EVENTS
  // ===============================
  const refetch = async () => {
    if (!upperAlliance) return;

    const { data } = await supabase
      .from("alliance_events")
      .select("*")
      .eq("alliance_id", upperAlliance)
      .order("start_time_utc", { ascending: true });

    setEvents((data || []) as EventRow[]);
    setLoading(false);
  };

  useEffect(() => {
    refetch();
  }, [upperAlliance]);

  // ===============================
  // SAVE EVENT
  // ===============================
  const saveEvent = async () => {
    if (!canEdit) return;

    const trimmedTitle = form.title.trim();
    if (!trimmedTitle) return alert("Event Title required.");

    if (!form.start_date || !form.start_time || !form.end_date || !form.end_time) {
      return alert("Start/End date & time required.");
    }

    if (!userId) return alert("Missing user session.");

    const startLocal = new Date(`${form.start_date}T${form.start_time}`);
    const endLocal = new Date(`${form.end_date}T${form.end_time}`);

    if (endLocal <= startLocal) {
      return alert("End must be after start.");
    }

    const durationMinutes = Math.max(
      1,
      Math.round((endLocal.getTime() - startLocal.getTime()) / 60000)
    );

    const payload = {
      alliance_id: upperAlliance,
      title: trimmedTitle,
      created_by: userId,
      start_time_utc: startLocal.toISOString(),
      duration_minutes: durationMinutes,
      event_type: form.event_type,
      timezone_origin: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    const { error } = await supabase
      .from("alliance_events")
      .insert(payload);

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

    refetch();
  };

  // ===============================
  // DELETE
  // ===============================
  const deleteEvent = async (id: string) => {
    if (!canEdit) return;
    if (!confirm("Delete this event?")) return;

    await supabase.from("alliance_events").delete().eq("id", id);
    refetch();
  };

  // ===============================
  // REMINDER ENGINE (SAFE)
  // ===============================
  useEffect(() => {
    if (!events.length) return;

    const offsets = [60, 30, 15, 5];
    const triggered = new Set<string>();

    const interval = setInterval(() => {
      const now = new Date();

      events.forEach((event) => {
        const start = new Date(event.start_time_utc);
        const diff = Math.floor((start.getTime() - now.getTime()) / 60000);

        offsets.forEach((offset) => {
          const key = event.id + "-" + offset;
          if (diff === offset && !triggered.has(key)) {
            triggered.add(key);
            alert(`🔔 ${event.title} starts in ${offset} minutes`);
          }
        });
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [events]);

  // ===============================
  // RENDER
  // ===============================
  return (
    <div style={{ padding: 24 }}>
      <h2>📅 Alliance Calendar — {upperAlliance}</h2>

      {canEdit && (
        <button onClick={() => setShowModal(true)}>➕ Create Event</button>
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
                border: "1px solid rgba(0,255,0,0.3)",
                padding: 8,
                minHeight: 100,
              }}
            >
              <strong>{day}</strong>

              {dayEvents.map((e) => (
                <div
                  key={e.id}
                  style={{ marginTop: 6, fontSize: 12 }}
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
        <div>
          <input
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />

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
      )}
    </div>
  );
}
