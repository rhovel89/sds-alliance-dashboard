import { useParams } from "react-router-dom";

export default function AllianceCalendarPage() {
  const { alliance_id } = useParams<{ alliance_id: string }>();

  return (
    <div style={{ padding: 30 }}>
      <h1 style={{ fontSize: 24 }}>
        📅 Alliance Calendar — {alliance_id?.toUpperCase()}
      </h1>

      <div
        style={{
          marginTop: 20,
          padding: 20,
          borderRadius: 12,
          background: "rgba(0,0,0,0.4)",
          border: "1px solid rgba(0,255,0,0.3)",
        }}
      >
        Calendar UI Coming Next...
      </div>
    </div>
  );
}
