import { useState } from "react";

type Cell = {
  player_name?: string;
};

const TOTAL_HQ = 120;
const COLUMNS = 10;

// 🔐 TEMP ROLE SIMULATION (safe)
// Change to: "member" | "mod" | "owner"
const role: "owner" | "mod" | "member" = "owner";

export default function HQMap() {
  const [cells, setCells] = useState<Cell[]>(
    Array.from({ length: TOTAL_HQ }, () => ({}))
  );

  const [selected, setSelected] = useState<number | null>(null);

  const canEdit = role === "owner" || role === "mod";

  function updateCell(index: number, value: string) {
    if (!canEdit) return;

    setCells(prev => {
      const next = [...prev];
      next[index] = { player_name: value };
      return next;
    });
  }

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ color: "#9fef00" }}>🧟 Alliance HQ Map</h2>
      <p style={{ color: "#6b6b6b", fontSize: 12 }}>
        Role: <strong>{role}</strong> — Total HQs: {TOTAL_HQ}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
          gap: 12,
          marginTop: 20
        }}
      >
        {cells.map((cell, i) => (
          <div
            key={i}
            onClick={() => {
              if (canEdit) setSelected(i);
            }}
            style={{
              border: "1px solid #2a2a2a",
              background: selected === i ? "#111" : "#0b0b0b",
              color: "#9fef00",
              padding: 10,
              minHeight: 60,
              fontSize: 12,
              cursor: canEdit ? "pointer" : "default",
              opacity: !canEdit && selected === i ? 0.6 : 1
            }}
          >
            <div style={{ fontWeight: 600 }}>HQ {i + 1}</div>
            <div style={{ opacity: 0.7 }}>
              {cell.player_name || "— empty —"}
            </div>
          </div>
        ))}
      </div>

      {canEdit && selected !== null && (
        <div style={{ marginTop: 20 }}>
          <h4 style={{ color: "#9fef00" }}>
            Editing HQ {selected + 1}
          </h4>
          <input
            style={{
              background: "#000",
              color: "#9fef00",
              border: "1px solid #333",
              padding: 6,
              width: 240
            }}
            placeholder="Player Game Name"
            value={cells[selected]?.player_name || ""}
            onChange={(e) => updateCell(selected, e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
