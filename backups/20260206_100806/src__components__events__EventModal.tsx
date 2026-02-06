import { useState } from "react";

export default function EventModal({ date, onSave, onCancel }) {
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [recurrence, setRecurrence] = useState("none");

  function handleSave() {
    onSave({
      title,
      date,
      startTime,
      endTime,
      recurrence_type: recurrence
    });
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Create Event</h2>

        <input
          placeholder="Event Name"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />

        <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
        <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />

        <select value={recurrence} onChange={e => setRecurrence(e.target.value)}>
          <option value="none">Once</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Bi-Weekly</option>
          <option value="monthly">Monthly</option>
        </select>

        <div className="modal-actions">
          <button onClick={handleSave}>SAVE</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
