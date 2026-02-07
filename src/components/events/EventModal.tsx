import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import "./event-modal.css";

type Props = {
  open: boolean;
  date: string | null;
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
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("13:00");
  const [frequency, setFrequency] = useState("once");
  const [days, setDays] = useState<string[]>([]);
  const [scope, setScope] = useState("alliance");

  useEffect(() => {
    if (event) {
      setName(event.name ?? "");
      setStartTime(event.start_time ?? "12:00");
      setEndTime(event.end_time ?? "13:00");
      setFrequency(event.frequency ?? "once");
      setDays(event.days ?? []);
      setScope(event.scope ?? "alliance");
    }
  }, [event]);

  if (!open || !date) return null;

  async function handleSave() {
    const payload = {
      alliance_id: allianceId,
      name,
      event_date: date,
      start_time: startTime,
      end_time: endTime,
      frequency,
      days,
      scope
    };

    const { error } = await supabase
      .from("alliance_events")
      .upsert(payload);

    if (!error) {
      onSaved();
      onClose();
    }
  }

  function toggleDay(d: string) {
    setDays(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    );
  }

  return (
    <div className="event-modal-backdrop">
      <div className="event-modal">
        <h1>Create Event</h1>
        <div className="event-date">Date: {date}</div>

        <label>Event Name</label>
        <input value={name} onChange={e => setName(e.target.value)} />

        <div className="time-row">
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
          <option value="weekly">Weekly</option>
        </select>

        {frequency === "weekly" && (
          <>
            <label>Days</label>
            <div className="days-row">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                <label key={d}>
                  <input
                    type="checkbox"
                    checked={days.includes(d)}
                    onChange={() => toggleDay(d)}
                  />
                  {d}
                </label>
              ))}
            </div>
          </>
        )}

        <label>Scope</label>
        <select value={scope} onChange={e => setScope(e.target.value)}>
          <option value="alliance">Alliance Event</option>
          <option value="state">State Event</option>
        </select>

        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="save" onClick={handleSave}>Save Event</button>
        </div>
      </div>
    </div>
  );
}
