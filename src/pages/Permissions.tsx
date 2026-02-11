import { useParams } from "react-router-dom";

export default function Permissions() {
  const { alliance_id } = useParams<{ alliance_id: string }>();

  if (!alliance_id) {
    return <div style={{ padding: 24 }}>No alliance selected</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>🔐 Permissions</h1>
      <p>Alliance: <strong>{alliance_id.toUpperCase()}</strong></p>
      <p>Permissions UI coming next.</p>
    </div>
  );
}
