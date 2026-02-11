import { useParams } from "react-router-dom";

export default function PermissionsPage() {
  const { alliance_id } = useParams<{ alliance_id: string }>();

  return (
    <div style={{ padding: 24 }}>
      <h1>🔐 Permissions</h1>
      <p>Alliance: {alliance_id?.toUpperCase()}</p>
      <p>Permissions system coming next.</p>
    </div>
  );
}
