import { useState } from "react";

export default function EventModal({ open, date, onClose, onSave }: any) {
  if (!open) return null;

  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("13:00");
  const [frequency, setFrequency] = useState("Weekly");
  const [scope, setScope] = useState("alliance");
  const [days, setDays] = useState<string[]>([]);

  function toggleDay(day: string) {
    setDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  }

  function handleSave() {
    if (!title.trim()) {
      alert("Event name is required");
      return;
    }

    onSave({
      title,
      date,
      startTime,
      endTime,
      frequency,
      days,
      scope
    });
  }

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.75)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{
        background: "#111",
        color: "#fff",
        padding: "24px",
        width: "480px",
        borderRadius: "8px"
      }}>
        <h2>Create Event</h2>
        <p>Date: {date}</p>

        <label>Event Name</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
        />

        <label>Start Time</label>
        <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />

        <label style={{ marginLeft: "10px" }}>End Time</label>
        <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />

        <div style={{ marginTop: "10px" }}>
          <label>Frequency</label>
          <select value={frequency} onChange={e => setFrequency(e.target.value)}>
            <option>Daily</option>
            <option>Weekly</option>
            <option>Bi-Weekly</option>
            <option>Monthly</option>
            <option>Custom</option>
          </select>
        </div>

        <div style={{ marginTop: "10px" }}>
          <label>Days</label>
          <div>
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
              <label key={d} style={{ marginRight: "8px" }}>
                <input
                  type="checkbox"
                  checked={days.includes(d)}
                  onChange={() => toggleDay(d)}
                /> {d}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginTop: "10px" }}>
          <label>Scope</label>
          <select value={scope} onChange={e => setScope(e.target.value)}>
            <option value="alliance">Alliance Event</option>
            <option value="state">State Event</option>
          </select>
        </div>

        <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSave} style={{ background: "#4caf50" }}>
            Save Event
          </button>
        </div>
      </div>
    </div>
  );
}
