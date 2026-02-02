import { useMyAlliances } from "../hooks/useMyAlliances";

export default function AllianceDashboard() {
  const { alliances, loading } = useMyAlliances();

  if (loading) {
    return <div className="page">Loading alliances…</div>;
  }

  if (!alliances || alliances.length === 0) {
    return <div className="page">You are not assigned to any alliances.</div>;
  }

  return (
    <div className="page">
      {alliances.map(a => (
        <div key={a.alliance_id} className="card">
          <h2>{a.alliance_name}</h2>
          <p>{a.role_label}</p>
        </div>
      ))}
    </div>
  );
}
