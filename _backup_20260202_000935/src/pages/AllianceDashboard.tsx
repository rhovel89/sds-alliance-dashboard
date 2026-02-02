import { useMyAlliances } from "../hooks/useMyAlliances";

export default function AllianceDashboard() {
  const { alliances, loading } = useMyAlliances();

  if (loading) return <p>Loading alliances…</p>;

  if (alliances.length === 0) {
    return <p>You are not assigned to any alliances.</p>;
  }

  return (
    <div style={{ padding: 32 }}>
      <h2>My Alliances</h2>

      <ul>
        {alliances.map(a => (
          <li key={a.alliance_id}>
            {a.alliances.name} ({a.role_label})
          </li>
        ))}
      </ul>

      <p>Select an alliance to view its dashboard.</p>
    </div>
  );
}
