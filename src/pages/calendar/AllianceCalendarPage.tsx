import { useParams } from "react-router-dom";

export default function AllianceCalendarPage() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = (alliance_id || "").toUpperCase();

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDayIndex = firstDay.getDay(); // 0 = Sunday

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];

  for (let i = 0; i < startDayIndex; i++) {
    cells.push(null);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  return (
    <div style={{ padding: 24, color: "#b6ff9e" }}>
      <h1 style={{ marginBottom: 20 }}>
        📅 Alliance Calendar — {upperAlliance}
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 10,
          maxWidth: 900,
        }}
      >
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(day => (
          <div
            key={day}
            style={{
              textAlign: "center",
              fontWeight: 700,
              padding: 8,
              background: "rgba(0,255,0,0.1)",
              borderRadius: 6
            }}
          >
            {day}
          </div>
        ))}

        {cells.map((day, i) => (
          <div
            key={i}
            style={{
              height: 100,
              borderRadius: 10,
              border: "1px solid rgba(0,255,0,0.25)",
              background: "rgba(0,0,0,0.35)",
              padding: 8,
              fontSize: 14,
              position: "relative"
            }}
          >
            {day && (
              <div style={{ fontWeight: 600 }}>
                {day}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
