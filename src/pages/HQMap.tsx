import { useState } from "react";

type Cell = {
  player_name?: string;
};

export default function HQMap() {
  const [cells] = useState<Cell[]>(
    Array.from({ length: 20 }, () => ({}))
  );

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ color: "#9fef00" }}>🧟 Alliance HQ Map (Static)</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 12,
          marginTop: 20
        }}
      >
        {cells.map((cell, i) => (
          <div
            key={i}
            style={{
              border: "1px solid #333",
              background: "#111",
              color: "#9fef00",
              padding: 12,
              minHeight: 60,
              fontSize: 13
            }}
          >
            <div>HQ {i + 1}</div>
            <div>{cell.player_name || "— empty —"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
