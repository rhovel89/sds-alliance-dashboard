import { useParams } from "react-router-dom";

export default function Permissions() {
  const { allianceId } = useParams();

  if (!allianceId) {
    return (
      <div style={{ padding: 24, color: "#9f9" }}>
        ⚠️ No alliance selected.
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ color: "#9f9" }}>🔐 Permissions</h1>
      <p style={{ color: "#ccc" }}>
        Alliance: <strong>{allianceId.toUpperCase()}</strong>
      </p>

      <ul style={{ marginTop: 16, color: "#aaa" }}>
        <li>Members: View only</li>
        <li>R4 / R5: Add / Edit / Remove</li>
        <li>Owner: Global permissions</li>
      </ul>
    </div>
  );
}
