import { useParams } from "react-router-dom";

export default function AllianceHQMap() {
  const params = useParams();
  const allianceId = params?.allianceId || params?.alliance || "UNKNOWN";

  if (!allianceId) {
    return (
      <div style={{ padding: 24, color: "#9f9" }}>
        🧟 HQ MAP SAFE MODE — Waiting for alliance...
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ color: "#9f9" }}>
        🧟 HQ MAP LOADED FOR ALLIANCE: {allianceId}
      </h2>

      <div
        style={{
          position: "relative",
          width: 800,
          height: 800,
          border: "2px solid #0f0",
          marginTop: 16,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 405,
            top: 382,
            background: "#7CFF3A",
            color: "#000",
            padding: "6px 10px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: "bold",
          }}
        >
          SDS Farm HQ
          <br />
          X:405 Y:382
        </div>

        <div
          style={{
            position: "absolute",
            left: 512,
            top: 488,
            background: "#7CFF3A",
            color: "#000",
            padding: "6px 10px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: "bold",
          }}
        >
          Test HQ
          <br />
          X:512 Y:488
        </div>
      </div>
    </div>
  );
}
