import { useState, useMemo } from "react";
import "./event-modal.css";

type Props = {
  date: Date | null;
  onClose: () => void;
};

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export default function EventModal({ date, onClose }: Props) {
  if (!date) return null;

  const [name, setName] = useState("");
  const [freq, setFreq] = useState("One Time");
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("13:00");
  const [showUTC, setShowUTC] = useState(false);
  const [days, setDays] = useState<string[]>([]);

  const maxEndDate = useMemo(() => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().substring(0,10);
  }, [date]);

  function toggleDay(day: string) {
    setDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }

  function toUTC(time: string) {
    const [h, m] = time.split(":").map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d.toUTCString().split(" ")[4].substring(0,5);
  }

  return (
    <div className="event-modal-backdrop">
      <div className="event-modal">
        <h3>Create Event</h3>

        <div className="event-field">
          <label>Event Name</label>
          <input value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div className="event-row">
          <div className="event-field">
            <label>Start Time (Local)</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            {showUTC && <small>UTC: {toUTC(startTime)}</small>}
          </div>

          <div className="event-field">
            <label>End Time (Local)</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            {showUTC && <small>UTC: {toUTC(endTime)}</small>}
          </div>
        </div>

        <div className="event-field">
          <label>
            <input type="checkbox" checked={showUTC} onChange={() => setShowUTC(!showUTC)} />
            Show UTC
          </label>
        </div>

        <div className="event-field">
          <label>Frequency</label>
          <select value={freq} onChange={e => setFreq(e.target.value)}>
            <option>One Time</option>
            <option>Daily</option>
            <option>Weekly</option>
            <option>Bi-Weekly</option>
            <option>Monthly</option>
            <option>Custom</option>
          </select>
        </div>

        {(freq === "Weekly" || freq === "Custom") && (
          <div className="event-field">
            <label>Days of Week</label>
            <div className="dow-grid">
              {DAYS.map(d => (
                <button
                  key={d}
                  className={days.includes(d) ? "active" : ""}
                  onClick={() => toggleDay(d)}
                  type="button"
                >
                  {d.substring(0,3)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="event-row">
          <div className="event-field">
            <label>Start Date</label>
            <input type="date" defaultValue={date.toISOString().substring(0,10)} />
          </div>

          <div className="event-field">
            <label>End Date (max 3 months)</label>
            <input type="date" max={maxEndDate} />
          </div>
        </div>

        <div className="event-actions">
          <button className="cancel" onClick={onClose}>Cancel</button>
          <button
            className="save"
            onClick={() => alert("Next step: apply to this occurrence or all future")}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
