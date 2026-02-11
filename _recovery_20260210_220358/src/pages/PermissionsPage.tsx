import { useParams } from "react-router-dom";

export default function PermissionsPage() {
  const { alliance_id } = useParams<{ alliance_id: string }>();

  return (
    <div style={{ padding: 24 }}>
      <h1>🔐 Permissions</h1>
      <p>Alliance: <strong>{alliance_id?.toUpperCase()}</strong></p>

      <div className="zombie-card" style={{ marginTop: 16 }}>
        <p>This is the Permissions control center.</p>
        <p>
          <strong>Owner:</strong> Full control<br />
          <strong>R5 / R4:</strong> Alliance permissions<br />
          <strong>Members:</strong> View only
        </p>
      </div>
    </div>
  );
}
