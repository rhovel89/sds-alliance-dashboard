import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function EventModal({ open, date, event, allianceId, onClose, onSaved }: any) {
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("13:00");
  const [frequency, setFrequency] = useState("once");

  useEffect(() => {
    if (event) {
      setTitle(event.title || "");
    } else {
      setTitle("");
    }
  }, [event]);

  if (!open || !date) return null;

  async function handleSave() {
    if (!title) return;

    const start = new Date(`${date}T${startTime}:00Z`);
    const end = new Date(`${date}T${endTime}:00Z`);

    const payload = {
      alliance_id: allianceId,
      title,
      start_time_utc: start.toISOString(),
      end_time_utc: end.toISOString(),
      frequency
    };

    const res = event?.id
      ? await supabase.from("alliance_events").update(payload).eq("id", event.id)
      : await supabase.from("alliance_events").insert(payload);

    if (res.error) {
      console.error(res.error);
      return;
    }

    onSaved?.();
    onClose();
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Create Event</h2>
        <p>Date: {date}</p>

        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event Name" />

        <div>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
        </div>

        <select value={frequency} onChange={e => setFrequency(e.target.value)}>
          <option value="once">Once</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="bi-weekly">Bi-Weekly</option>
          <option value="monthly">Monthly</option>
        </select>

        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSave}>Save Event</button>
        </div>
      </div>
    </div>
  );
}
