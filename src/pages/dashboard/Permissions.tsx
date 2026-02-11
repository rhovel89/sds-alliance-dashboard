import { useParams } from "react-router-dom";

export default function PermissionsPage() {
  const { alliance_id } = useParams<{ alliance_id: string }>();

  if (!alliance_id) {
    return <div style={{ padding: 24 }}>No alliance selected</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>🔐 Permissions — {alliance_id.toUpperCase()}</h1>
      <p>This page is live and safe.</p>
    </div>
  );
}
