import { useNavigate } from "react-router-dom";
import { useAlliancesList } from "../hooks/useAlliancesList";

export default function OwnerDashboardSelect() {
  const navigate = useNavigate();
  const { alliances, loading: alliancesLoading, error: alliancesError } = useAlliancesList();

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
        onClick={() => navigate("/dashboard/" + String((alliances?.[0]?.code) || "").toUpperCase() + "")}
      >
        {alliancesLoading ? (
          <div style={{ opacity: 0.75 }}>Loading alliances…</div>
        ) : alliancesError ? (
          <div style={{ color: "#ffb3b3" }}>{alliancesError}</div>
        ) : (
          <>
            {alliances.map((a) => (
              <button
                key={a.code}
                onClick={() => navigate("/dashboard/" + a.code)}
              >
                {a.code} — {a.name || a.code}
              </button>
            ))}
          </>
        )}
      </button>
    </div>
  );
}


