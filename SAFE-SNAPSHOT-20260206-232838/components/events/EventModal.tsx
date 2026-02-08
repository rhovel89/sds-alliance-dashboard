import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import "./event-modal.css";

type Props = {
  open: boolean;
  date: string;
  event?: any;
  allianceId: string;
  onClose: () => void;
  onSaved: () => void;
};

export default function EventModal({
  open,
  date,
  event,
  allianceId,
  onClose,
  onSaved
}: Props) {
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("13:00");
  const [frequency, setFrequency] = useState("once");
  const [scope, setScope] = useState("alliance");

  useEffect(() => {
    if (event) {
      setTitle(event.title || "");
    } else {
      setTitle("");
    }
  }, [event]);

  if (!open) return null;

  async function handleSave() {
    if (!title || !date) return;

    const startIso = new Date(`${date}T${startTime}:00Z`).toISOString();
    const endIso = new Date(`${date}T${endTime}:00Z`).toISOString();

    const payload = {
      alliance_id: allianceId,
      title,
      start_time_utc: startIso,
      end_time_utc: endIso,
      frequency,
      scope
    };

    const result = event?.id
      ? await supabase.from("alliance_events").update(payload).eq("id", event.id)
      : await supabase.from("alliance_events").insert(payload);

    if (result.error) {
      console.error("❌ Save failed", result.error);
      return;
    }

    onSaved();
    onClose();
  }

  return (
    <div className="event-modal-overlay">
      <div className="event-modal">
        <h2>Create Event</h2>
        <div>Date: {date}</div>

        <label>Event Name</label>
        <input value={title} onChange={e => setTitle(e.target.value)} />

        <div className="row">
          <div>
            <label>Start Time</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
          <div>
            <label>End Time</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </div>
        </div>

        <label>Frequency</label>
        <select value={frequency} onChange={e => setFrequency(e.target.value)}>
          <option value="once">Once</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="bi-weekly">Bi-Weekly</option>
          <option value="monthly">Monthly</option>
        </select>

        <label>Scope</label>
        <select value={scope} onChange={e => setScope(e.target.value)}>
          <option value="alliance">Alliance Event</option>
          <option value="state">State Event</option>
        </select>

        <div className="actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={handleSave}>Save Event</button>
        </div>
      </div>
    </div>
  );
}
