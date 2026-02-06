import "./event-modal.css";

type Props = {
  date: Date | null;
  onClose: () => void;
};

export default function EventModal({ date, onClose }: Props) {
  if (!date) return null;

  return (
    <div className="event-modal-backdrop">
      <div className="event-modal">
        <h3>Create Event</h3>

        <div className="event-field">
          <label>Event Name</label>
          <input type="text" placeholder="Event name" />
        </div>

        <div className="event-row">
          <div className="event-field">
            <label>Start Time (Local)</label>
            <input type="time" />
          </div>

          <div className="event-field">
            <label>End Time (Local)</label>
            <input type="time" />
          </div>
        </div>

        <div className="event-field">
          <label>Frequency</label>
          <select>
            <option>One Time</option>
            <option>Daily</option>
            <option>Weekly</option>
            <option>Bi-Weekly</option>
            <option>Monthly</option>
            <option>Custom</option>
          </select>
        </div>

        <div className="event-row">
          <div className="event-field">
            <label>Start Date</label>
            <input type="date" defaultValue={date.toISOString().substring(0,10)} />
          </div>

          <div className="event-field">
            <label>End Date</label>
            <input type="date" />
          </div>
        </div>

        <div className="event-actions">
          <button className="cancel" onClick={onClose}>Cancel</button>
          <button className="save" disabled>Save (Next Step)</button>
        </div>
      </div>
    </div>
  );
}
