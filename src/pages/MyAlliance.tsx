import "../styles/command-center.css";

export default function MyAlliance() {
  return (
    <div className="command-center">

      <div className="cc-header">
        <h2>🧠 Alliance Command Center</h2>
        <p>Systems operational • Surveillance active</p>
      </div>

      <div className="cc-grid">

        <div className="cc-card scanner">
          <h3>🧟 Alliance Overview</h3>
          <p>Status: <span className="cc-ok">ACTIVE</span></p>
          <p>Members: <strong>—</strong></p>
        </div>

        <div className="cc-card scanner">
          <h3>🗺 HQ Status</h3>
          <p>HQ Slots: <strong>120</strong></p>
          <p>Occupied: <strong>—</strong></p>
          <p>Lock: <span className="cc-ok">UNLOCKED</span></p>
        </div>

        <div className="cc-card scanner">
          <h3>📅 Event Intel</h3>
          <p>Upcoming Events: <strong>—</strong></p>
          <p>Next Event: <em>Unknown</em></p>
        </div>

        <div className="cc-card scanner danger">
          <h3>☣️ State Threat Level</h3>
          <p className="cc-threat high">HIGH</p>
          <p>Zombie activity detected</p>
        </div>

      </div>

    </div>
  );
}
