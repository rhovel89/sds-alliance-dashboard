import { useNavigate } from "react-router-dom";

export default function OwnerDashboardSelect() {
  const navigate = useNavigate();

  return (
    <div className="zombie-card" style={{ maxWidth: 420, margin: "0 auto" }}>
      <h2>🧟 Select Dashboard</h2>

      <button
        className="zombie-btn"
        style={{ width: "100%", marginTop: 12 }}
        onClick={() => navigate("/state/1")}
      >
        State 789 Dashboard
      </button>

      <hr className="zombie-divider" />

      <button
        className="zombie-btn"
        style={{ width: "100%", marginTop: 8 }}
        onClick={() => navigate("/dashboard/SDS")}
      >
        SDS Alliance
      </button>

      <button
        className="zombie-btn"
        style={{ width: "100%", marginTop: 8 }}
        onClick={() => navigate("/dashboard/WOC")}
      >
        WOC Alliance
      </button>

      <button
        className="zombie-btn"
        style={{ width: "100%", marginTop: 8 }}
        onClick={() => navigate("/dashboard/OZ")}
      >
        OZ Alliance
      </button>
    </div>
  );
}
