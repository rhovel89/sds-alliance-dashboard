import { useParams } from "react-router-dom";

export default function AllianceCalendarPage() {
  const { alliance_id } = useParams<{ alliance_id: string }>();

  return (
    <div style={{ padding: 24 }}>
      <h2>📅 Alliance Calendar — {alliance_id?.toUpperCase()}</h2>
      <p>Alliance calendar system initializing...</p>
    </div>
  );
}
