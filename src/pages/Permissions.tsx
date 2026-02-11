import { useParams } from "react-router-dom";

export default function Permissions() {
  const { alliance_id } = useParams<{ alliance_id: string }>();

  if (!alliance_id) {
    return <div style={{ padding: 24 }}>No alliance selected</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>🔐 Permissions — {alliance_id.toUpperCase()}</h2>
      <p>Permissions UI will be built here.</p>
    </div>
  );
}
