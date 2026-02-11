import { useParams } from "react-router-dom";

export default function PermissionsPage() {
  const { alliance_id } = useParams<{ alliance_id: string }>();

  return (
    <div style={{ padding: 24 }}>
      <h1>🔐 Alliance Permissions</h1>
      <p>Alliance: {alliance_id?.toUpperCase()}</p>

      <p style={{ opacity: 0.7 }}>
        Permissions UI coming next.
      </p>
    </div>
  );
}
