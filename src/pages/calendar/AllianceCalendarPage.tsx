import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";

type EventRow = {
  id: string;
  alliance_id: string;
  title: string;
  event_type: string | null;
  event_name: string | null;
  start_time_utc: string;
  duration_minutes: number;
  start_date: string | null; // YYYY-MM-DD
  end_date: string | null;   // YYYY-MM-DD
  start_time: string | null; // HH:mm
  end_time: string | null;   // HH:mm
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

function parseYMD(ymd: string): { y: number; m: number; d: number } | null {
  // Expect "YYYY-MM-DD"
  const parts = ymd.split("-");
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]) - 1; // JS month 0..11
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return { y, m, d };
}

export default function AllianceCalendarPage() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = (alliance_id || "").toUpperCase();

  // role enforcement (Owner/R5/R4 etc) via your existing hook
  const { canEdit } = useHQPermissions(upperAlliance);

  const [userId, setUserId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const refetch = async () => {
    if (!upperAlliance) return;
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("alliance_events")
      .select("*")
      .eq("alliance_id", upperAlliance)
      .order("start_time_utc", { ascending: true });

    if (error) {
      console.error("CALENDAR SELECT ERROR:", error);
      setErrorMsg(error.message);
      setEvents([]);
      setLoading(false);
      return;
    }

    setEvents((data || []) as EventRow[]);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upperAlliance]);

  const saveEvent = async () => {
    if (!canEdit) return;

    const title = form.title.trim();
    if (!title) return alert("Event Title is required.");

    if (!form.start_date || !form.start_time || !form.end_date || !form.end_time) {
      return alert("Start/End date and time are required.");
    }

    if (!userId) return alert("Missing user session. Please refresh and try again.");

    // Build local datetimes from date+time inputs (local time)
    const startLocal = new Date(`${form.start_date}T${form.start_time}:00`);
    const endLocal = new Date(`${form.end_date}T${form.end_time}:00`);

    if (Number.isNaN(startLocal.getTime()) || Number.isNaN(endLocal.getTime())) {
      return alert("Invalid date/time values.");
    }
    if (endLocal <= startLocal) {
      return alert("End time must be after Start time.");
    }

    const durationMinutes = Math.max(
      1,
      Math.round((endLocal.getTime() - startLocal.getTime()) / 60000)
    );

    // Store UTC start for reminders/back-end logic
    const startUtcIso = startLocal.toISOString();

    const payload = {
      alliance_id: upperAlliance,

      // REQUIRED NOT NULL fields in your table:
      title: title,
      created_by: userId,
      start_time_utc: startUtcIso,
      duration_minutes: durationMinutes,

      // Keep these for display + filtering (prevents day-shift issues):
      start_date: form.start_date,
      end_date: form.end_date,
      start_time: form.start_time,
      end_time: form.end_time,

      // Optional / compatibility columns you also have:
      event_name: title,
      event_type: form.event_type,
      timezone_origin: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    const { error } = await supabase.from("alliance_events").insert(payload);

    if (error) {
      console.error("SAVE EVENT ERROR FULL:", error);
      alert(JSON.stringify(error, null, 2));
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

    await refetch(); // auto-refresh after save
  };

  const deleteEvent = async (id: string) => {
    if (!canEdit) return;
    if (!confirm("Delete this event?")) return;

    const { error } = await supabase.from("alliance_events").delete().eq("id", id);
    if (error) {
      console.error("DELETE EVENT ERROR:", error);
      alert(error.message);
      return;
    }
    await refetch();
  };

  const monthLabel = useMemo(() => {
    const d = new Date(year, month, 1);
    return d.toLocaleString(undefined, { month: "long", year: "numeric" });
  }, [month, year]);

  return (
    <div style={{ padding: 24, color: "#cfffbe" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>📅 Alliance Calendar — {upperAlliance}</h2>

        {canEdit && (
          <button className="zombie-btn" onClick={() => setShowModal(true)}>
            ➕ Create Event
          </button>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className="zombie-btn"
            onClick={() => {
              const d = new Date(year, month - 1, 1);
              setMonth(d.getMonth());
              setYear(d.getFullYear());
            }}
          >
            ◀
          </button>
          <div style={{ fontWeight: 700 }}>{monthLabel}</div>
          <button
            className="zombie-btn"
            onClick={() => {
              const d = new Date(year, month + 1, 1);
              setMonth(d.getMonth());
              setYear(d.getFullYear());
            }}
          >
            ▶
          </button>
        </div>
      </div>

      {loading && <div style={{ marginTop: 10, opacity: 0.8 }}>Loading…</div>}
      {errorMsg && <div style={{ marginTop: 10, color: "#ff6a6a" }}>{errorMsg}</div>}

      {/* Month Grid (visible) */}
      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(120px, 1fr))",
          gap: 10,
          alignItems: "stretch",
        }}
      >
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;

          // IMPORTANT: use start_date string (YYYY-MM-DD), not new Date(start_date)
          // This prevents timezone shifting the date backward.
          const dayEvents = events.filter((e) => {
            if (!e.start_date) return false;
            const p = parseYMD(e.start_date);
            if (!p) return false;
            return p.y === year && p.m === month && p.d === day;
          });

          return (
            <div
              key={day}
              style={{
                border: "1px solid rgba(0,255,0,0.22)",
                borderRadius: 12,
                padding: 10,
                minHeight: 120,
                background: "rgba(0,0,0,0.35)",
                boxShadow: "0 0 18px rgba(0,255,0,0.05)",
              }}
            >
              <div style={{ fontWeight: 800, opacity: 0.9 }}>{day}</div>

              {dayEvents.map((e) => (
                <div
                  key={e.id}
                  style={{
                    marginTop: 8,
                    padding: "6px 8px",
                    borderRadius: 10,
                    background: "rgba(0,255,0,0.12)",
                    border: "1px solid rgba(0,255,0,0.20)",
                    fontSize: 12,
                    cursor: canEdit ? "pointer" : "default",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={canEdit ? "Click to delete" : e.title}
                  onClick={() => {
                    if (!canEdit) return;
                    deleteEvent(e.id);
                  }}
                >
                  {e.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Create Event Modal */}
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
              width: 520,
              maxWidth: "92vw",
              background: "rgba(10,10,10,0.95)",
              border: "1px solid rgba(0,255,0,0.25)",
              borderRadius: 16,
              padding: 18,
              boxShadow: "0 0 30px rgba(0,255,0,0.12)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <h3 style={{ margin: 0, color: "#cfffbe" }}>Create Event</h3>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(0,0,0,0.35)",
                  color: "white",
                  padding: "6px 10px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Event Title</div>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Alliance Clash"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "rgba(0,0,0,0.35)",
                    color: "white",
                  }}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Event Type</div>
                <select
                  value={form.event_type}
                  onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "rgba(0,0,0,0.35)",
                    color: "white",
                  }}
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Start Date</div>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "rgba(0,0,0,0.35)",
                    color: "white",
                  }}
                />
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Start Time (Local)</div>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "rgba(0,0,0,0.35)",
                    color: "white",
                  }}
                />
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>End Date</div>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "rgba(0,0,0,0.35)",
                    color: "white",
                  }}
                />
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>End Time (Local)</div>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "rgba(0,0,0,0.35)",
                    color: "white",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 14 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(0,0,0,0.35)",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button className="zombie-btn" onClick={canEdit ? saveEvent : undefined} disabled={!canEdit}>
                Save Event
              </button>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
              Local time is used for input. We store UTC internally (start_time_utc) and duration in minutes.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
