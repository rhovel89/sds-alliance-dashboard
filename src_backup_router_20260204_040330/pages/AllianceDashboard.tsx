import { useMyAlliances } from "../hooks/useMyAlliances";
import { Link } from "react-router-dom";

export default function AllianceDashboard() {
  const { alliances, loading } = useMyAlliances();

  if (loading) {
    return <div className="page">Loading alliances...</div>;
  }

  if (!alliances || alliances.length === 0) {
    return <div className="page">You are not assigned to any alliances.</div>;
  }

  return (
    <div className="page">
      <h1>Your Alliances</h1>

      {alliances.map(a => (
        <div key={a.alliance_id} className="card">
          <h2>{a.alliance_name}</h2>
          <p>Role: {a.role_label}</p>

          {a.role_label === "Owner" && (
            <Link
              to={`/alliance/${a.alliance_id}/permissions`}
              className="btn"
            >
              Manage Alliance Permissions
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}

