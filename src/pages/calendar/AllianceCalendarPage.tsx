import { useParams } from "react-router-dom";

export default function AllianceCalendarPage() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = alliance_id?.toUpperCase() || "";

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];

  // Empty leading cells
  for (let i = 0; i < startDay; i++) {
    cells.push(<div key={"empty-" + i} />);
  }

  // Actual days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(
      <div
        key={d}
        style={{
          border: "1px solid rgba(0,255,0,0.25)",
          minHeight: 100,
          padding: 6,
          borderRadius: 8,
          background: "rgba(0,0,0,0.4)",
          color: "#b6ff9e",
          fontSize: 12
        }}
      >
        <div style={{ fontWeight: 700 }}>{d}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 20 }}>
        📅 Alliance Calendar — {upperAlliance}
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 10
        }}
      >
        {cells}
      </div>
    </div>
  );
}
