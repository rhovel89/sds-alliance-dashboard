import { useParams } from "react-router-dom";

export default function Permissions() {
  const { alliance_id } = useParams<{ alliance_id: string }>();

  if (!alliance_id) {
    return <div style={{ padding: 24 }}>No alliance selected</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>🔐 Permissions — {alliance_id.toUpperCase()}</h1>

      <p style={{ opacity: 0.7 }}>
        Owner, R5, and R4 can manage roles and permissions.
      </p>

      <div style={{
        marginTop: 24,
        padding: 16,
        border: "1px solid #333",
        background: "#111"
      }}>
        <p>Permissions UI coming next…</p>
      </div>
    </div>
  );
}
