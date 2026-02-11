import { useParams } from "react-router-dom";

export default function AlliancePermissions() {
  const { alliance_id } = useParams<{ alliance_id: string }>();

  return (
    <div style={{ padding: 24 }}>
      <h1>🔐 Alliance Permissions</h1>
      <p>Alliance: <strong>{alliance_id?.toUpperCase()}</strong></p>
      <p>Permissions UI loading correctly.</p>
    </div>
  );
}
