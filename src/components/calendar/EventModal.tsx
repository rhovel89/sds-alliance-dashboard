import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (event: any) => void;
};

export default function EventModal({ open, onClose, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [type, setType] = useState("Alliance");

  if (!open) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={{ marginBottom: 15 }}>Create Event</h2>

        <input
          placeholder="Event Name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle}
        />

        <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
          <option>Alliance</option>
          <option>State</option>
          <option>Sonic</option>
          <option>Dead Rising</option>
          <option>Defense of Alliance</option>
          <option>Wasteland King</option>
          <option>Valiance Conquest</option>
          <option>Tundra</option>
          <option>Alliance Clash</option>
          <option>Alliance Showdown</option>
          <option>FireFlies</option>
        </select>

        <label>Start Date</label>
        <input type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} style={inputStyle} />

        <label>End Date</label>
        <input type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} style={inputStyle} />

        <label>Start Time</label>
        <input type="time" value={startTime} onChange={(e)=>setStartTime(e.target.value)} style={inputStyle} />

        <label>End Time</label>
        <input type="time" value={endTime} onChange={(e)=>setEndTime(e.target.value)} style={inputStyle} />

        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          <button onClick={onClose} style={cancelBtn}>Cancel</button>
          <button
            onClick={() => {
              onSave({
                title,
                startDate,
                endDate,
                startTime,
                endTime,
                type
              });
              onClose();
            }}
            style={saveBtn}
          >
            Save Event
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999
};

const modalStyle: React.CSSProperties = {
  background: "#111",
  padding: 25,
  borderRadius: 12,
  width: 400,
  color: "white",
  boxShadow: "0 0 20px rgba(0,255,0,0.3)"
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 8,
  marginBottom: 10,
  borderRadius: 6,
  border: "1px solid #333",
  background: "#222",
  color: "white"
};

const cancelBtn: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 6,
  background: "#333",
  color: "white",
  border: "none",
  cursor: "pointer"
};

const saveBtn: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 6,
  background: "#00aa44",
  color: "white",
  border: "none",
  cursor: "pointer"
};
