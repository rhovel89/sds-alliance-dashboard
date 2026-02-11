import { useParams } from "react-router-dom";

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();

  if (!alliance_id) {
    return <div style={{ padding: 24 }}>No alliance selected.</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>🧟 HQ MAP LOADED FOR ALLIANCE: {alliance_id.toUpperCase()}</h1>
      <div style={{
        marginTop: 16,
        width: 800,
        height: 600,
        border: "2px dashed #444",
        position: "relative",
        background: "#111"
      }}>
        <div style={{ color: "#777", padding: 12 }}>
          HQ slots will render here
        </div>
      </div>
    </div>
  );
}
