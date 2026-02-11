import { useParams } from "react-router-dom";

export default function PermissionsPage() {
  const { alliance_id } = useParams<{ alliance_id: string }>();

  return (
    <div style={{ padding: 24 }}>
      <h1>🔐 Permissions — {alliance_id?.toUpperCase()}</h1>
      <p>Owner, R5, and R4 permissions will be managed here.</p>
    </div>
  );
}
