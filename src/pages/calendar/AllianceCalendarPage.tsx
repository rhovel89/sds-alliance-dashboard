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
    recurrence_type: "",
    recurrence_days: [] as string[],
    recurrence_end_date: "",
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

    const cleanTitle = form.title.trim();
    if (!cleanTitle) return alert("Event Title required.");
    if (!userId) return alert("No user session.");

    const startLocal = new Date(`${form.start_date}T${form.start_time}`);
    const endLocal = new Date(`${form.end_date}T${form.end_time}`);

    if (endLocal <= startLocal)
      return alert("End must be after start.");

    const durationMinutes = Math.max(
      1,
      Math.round((endLocal.getTime() - startLocal.getTime()) / 60000)
    );

    const payload = {
  alliance_id: upperAlliance,

  // REQUIRED NOT NULL COLUMNS
  title: form.title.trim(),
  created_by: userId,
  start_time_utc: startLocal.toISOString(),
  duration_minutes: durationMinutes,
  timezone_origin: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",

  // Optional
  event_name: form.title.trim(),
  event_type: form.event_type,
  start_date: form.start_date,
  end_date: form.end_date,
  start_time: form.start_time,
  end_time: form.end_time
};

    const { error } = await supabase
      .from("alliance_events")
      .insert(payload);

    if (error) {
      console.error(error);
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

  const monthLabel = useMemo(() => {
    return new Date(year, month).toLocaleString(undefined, {
      month: "long",
      year: "numeric",
    });
  }, [month, year]);

  // ✅ Calendar day match FIXED using UTC conversion
  const isSameDay = (utcString: string, y: number, m: number, d: number) => {
    const local = new Date(utcString);
    return (
      local.getFullYear() === y &&
      local.getMonth() === m &&
      local.getDate() === d
    );
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
        <strong>{monthLabel}</strong>
      </div>

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

          const dayEvents = events.filter((e) =>
            isSameDay(e.start_time_utc, year, month, day)
          );

          return (
            <div
              key={day}
              style={{
                border: "1px solid #444",
                borderRadius: 8,
                padding: 10,
                minHeight: 100,
              }}
            >
              <strong>{day}</strong>

              {dayEvents.map((e) => (
                <div
                  key={e.id}
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    cursor: canEdit ? "pointer" : "default",
                  }}
                  onClick={() => deleteEvent(e.id)}
                >
                  {new Date(e.start_time_utc).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  — {e.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div style={{ marginTop: 20 }}>
          <h3>Create Event</h3>

          <input
            placeholder="Title"
            value={form.title}
            onChange={(e) =>
              setForm({ ...form, title: e.target.value })
            }
          />

          <input
            type="date"
            value={form.start_date}
            onChange={(e) =>
              setForm({ ...form, start_date: e.target.value })
            }
          />

          <input
            type="time"
            value={form.start_time}
            onChange={(e) =>
              setForm({ ...form, start_time: e.target.value })
            }
          />

          <input
            type="date"
            value={form.end_date}
            onChange={(e) =>
              setForm({ ...form, end_date: e.target.value })
            }
          />

          <input
            type="time"
            value={form.end_time}
            onChange={(e) =>
              setForm({ ...form, end_time: e.target.value })
            }
          />

          <button onClick={saveEvent}>Save</button>
        </div>
      )}
    </div>
  );
}




