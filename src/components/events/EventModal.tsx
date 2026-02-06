import { useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  date: string | null;
  onClose: () => void;
  onSave: (payload: any) => Promise<void> | void;
};

const RECURRENCE = [
  { value: "none", label: "None" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
];

const DAYS = [
  { value: "Sun", label: "Sun" },
  { value: "Mon", label: "Mon" },
  { value: "Tue", label: "Tue" },
  { value: "Wed", label: "Wed" },
  { value: "Thu", label: "Thu" },
  { value: "Fri", label: "Fri" },
  { value: "Sat", label: "Sat" },
];

export default function EventModal({ open, date, onClose, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("13:00");
  const [recurrence, setRecurrence] = useState("none");
  const [days, setDays] = useState<string[]>([]);
  const [scope, setScope] = useState<"alliance" | "state">("alliance");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setStartTime("12:00");
    setEndTime("13:00");
    setRecurrence("none");
    setDays([]);
    setScope("alliance");
    setSaving(false);
  }, [open]);

  const canPickDays = useMemo(() => recurrence === "weekly" || recurrence === "biweekly", [recurrence]);

  if (!open || !date) return null;

  async function handleSave() {
    if (!title.trim()) {
      alert("Event name is required.");
      return;
    }
    if (!startTime || !endTime) {
      alert("Start and end time are required.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        date,
        startTime,
        endTime,
        recurrence_type: recurrence,      // matches Supabase enum labels
        days_of_week: canPickDays ? days : [],
        scope,
      });
      onClose();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Save failed. Check console.");
    } finally {
      setSaving(false);
    }
  }

  function toggleDay(v: string) {
    setDays((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Create Event</div>
        <div style={{ opacity: 0.9, marginBottom: 10 }}>Date: <b>{date}</b></div>

        <div className="modal-row">
          <div className="modal-label">Event Name</div>
          <input
            className="modal-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event name"
          />
        </div>

        <div className="modal-row two">
          <div>
            <div className="modal-label">Start Time</div>
            <input className="modal-input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div>
            <div className="modal-label">End Time</div>
            <input className="modal-input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>

        <div className="modal-row two">
          <div>
            <div className="modal-label">Frequency</div>
            <select className="modal-select" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
              {RECURRENCE.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="modal-label">Scope</div>
            <select className="modal-select" value={scope} onChange={(e) => setScope(e.target.value as any)}>
              <option value="alliance">Alliance Event</option>
              <option value="state">State Event</option>
            </select>
          </div>
        </div>

        {canPickDays && (
          <div className="modal-row">
            <div className="modal-label">Days</div>
            <div className="days-row">
              {DAYS.map((d) => (
                <label key={d.value} className="day-chip">
                  <input type="checkbox" checked={days.includes(d.value)} onChange={() => toggleDay(d.value)} />
                  {d.label}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-save" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Event"}
          </button>
        </div>
      </div>
    </div>
  );
}
