import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import "./event-modal.css";

type Props = {
  open: boolean;
  date: string | null;          // YYYY-MM-DD
  event: any | null;
  allianceId: string;
  onClose: () => void;
  onSaved?: () => void;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toUtcIso(dateIso: string, time12h: string) {
  // time12h example: "12:00 PM"
  const m = time12h.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;

  let hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();

  if (ap === "PM" && hh !== 12) hh += 12;
  if (ap === "AM" && hh === 12) hh = 0;

  // Build local datetime, then store UTC ISO
  const d = new Date(${dateIso}T::00);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function defaultTimeLabel(d: Date) {
  let hh = d.getHours();
  const mm = d.getMinutes();
  const ap = hh >= 12 ? "PM" : "AM";
  hh = hh % 12;
  if (hh === 0) hh = 12;
  return ${hh}: ;
}

export default function EventModal({ open, date, event, allianceId, onClose, onSaved }: Props) {
  const safeDate = useMemo(() => date || null, [date]);

  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("12:00 PM");
  const [endTime, setEndTime] = useState("01:00 PM");
  const [frequency, setFrequency] = useState("weekly");
  const [scope, setScope] = useState("alliance");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    // Populate when editing
    if (event) {
      setTitle(event.title || event.event_name || "");
      setFrequency(event.frequency || "weekly");
      setScope(event.scope || "alliance");

      const s = event.startDate instanceof Date ? event.startDate : (event.start_time_utc ? new Date(event.start_time_utc) : null);
      const e = event.endDate instanceof Date ? event.endDate : (event.end_time_utc ? new Date(event.end_time_utc) : null);

      if (s && !isNaN(s.getTime())) setStartTime(defaultTimeLabel(s));
      if (e && !isNaN(e.getTime())) setEndTime(defaultTimeLabel(e));
    } else {
      // defaults for create
      setTitle("");
      setStartTime("12:00 PM");
      setEndTime("01:00 PM");
      setFrequency("weekly");
      setScope("alliance");
    }
  }, [open, event]);

  if (!open || !safeDate) return null;

  async function handleSave() {
    if (!title.trim()) return;

    const startIso = toUtcIso(safeDate, startTime);
    const endIso = toUtcIso(safeDate, endTime);

    if (!startIso) {
      console.error("❌ Invalid start time/date");
      return;
    }

    setSaving(true);

    // IMPORTANT: This payload assumes your table has these columns:
    // alliance_id, event_date, title, start_time_utc, end_time_utc, frequency, scope
    // If your title column is named differently (e.g. event_name), tell me and I will adjust in one pass.
    const payload: any = {
      alliance_id: allianceId,
      event_date: safeDate,
      title: title.trim(),
      start_time_utc: startIso,
      end_time_utc: endIso || null,
      frequency,
      scope
    };

    try {
      let res;
      if (event?.id) {
        res = await supabase
          .from("alliance_events")
          .update(payload)
          .eq("id", event.id)
          .select("*")
          .single();
      } else {
        res = await supabase
          .from("alliance_events")
          .insert(payload)
          .select("*")
          .single();
      }

      if (res.error) {
        console.error("❌ Failed to save event:", res.error);
        return;
      }

      await Promise.resolve(onSaved?.());
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div className="event-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="event-modal-title">Create Event</h2>

        <div className="event-modal-date">Date: {safeDate}</div>

        <label className="event-modal-label">Event Name</label>
        <input
          className="event-modal-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event name…"
        />

        <div className="event-modal-row">
          <div>
            <label className="event-modal-label">Start Time</label>
            <input
              className="event-modal-time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              placeholder="12:00 PM"
            />
          </div>

          <div>
            <label className="event-modal-label">End Time</label>
            <input
              className="event-modal-time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              placeholder="01:00 PM"
            />
          </div>
        </div>

        <label className="event-modal-label">Frequency</label>
        <select
          className="event-modal-select"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="bi-weekly">Bi-Weekly</option>
          <option value="monthly">Monthly</option>
        </select>

        <label className="event-modal-label">Scope</label>
        <select
          className="event-modal-select"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        >
          <option value="alliance">Alliance Event</option>
          <option value="state">State Event</option>
        </select>

        <div className="event-modal-actions">
          <button className="btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Event"}
          </button>
        </div>
      </div>
    </div>
  );
}
