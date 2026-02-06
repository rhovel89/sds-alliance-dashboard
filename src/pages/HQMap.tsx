import { useEffect, useState } from "react";

type Cell = {
  player_name?: string;
  coords?: string;
};

const TOTAL_HQ = 120;
const COLUMNS = 10;
const STORAGE_KEY = "hqmap:data:v1";

// 🔐 TEMP ROLE SIMULATION
const role: "owner" | "mod" | "member" = "owner";

export default function HQMap() {
  const [cells, setCells] = useState<Cell[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  const canEdit = role === "owner" || role === "mod";

  // 🔄 Load saved HQ data
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCells(parsed);
          return;
        }
      } catch {}
    }

    // Fallback init
    setCells(Array.from({ length: TOTAL_HQ }, () => ({})));
  }, []);

  // 💾 Persist on change
  useEffect(() => {
    if (cells.length === TOTAL_HQ) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cells));
    }
  }, [cells]);

  function updateCell(index: number, field: "player_name" | "coords", value: string) {
    if (!canEdit) return;

    setCells(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value
      };
      return next;
    });
  }

  if (cells.length !== TOTAL_HQ) {
    return <div style={{ padding: 24 }}>Loading HQ Map…</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ color: "#9fef00" }}>🧟 Alliance HQ Map</h2>
      <p style={{ color: "#6b6b6b", fontSize: 12 }}>
        Role: <strong>{role}</strong> — HQs persist locally
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
            onClick={() => canEdit && setSelected(i)}
            style={{
              border: "1px solid #2a2a2a",
              background: selected === i ? "#111" : "#0b0b0b",
              color: "#9fef00",
              padding: 10,
              minHeight: 70,
              fontSize: 12,
              cursor: canEdit ? "pointer" : "default"
            }}
          >
            <div style={{ fontWeight: 600 }}>HQ {i + 1}</div>
            <div style={{ opacity: 0.8 }}>
              {cell.player_name || "— empty —"}
            </div>
            <div style={{ opacity: 0.6, fontSize: 11 }}>
              {cell.coords || ""}
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
              width: 260,
              marginBottom: 8
            }}
            placeholder="Player Game Name"
            value={cells[selected]?.player_name || ""}
            onChange={(e) =>
              updateCell(selected, "player_name", e.target.value)
            }
          />

          <br />

          <input
            style={{
              background: "#000",
              color: "#9fef00",
              border: "1px solid #333",
              padding: 6,
              width: 260
            }}
            placeholder="Coordinates (e.g. S789 Y:342 X:212)"
            value={cells[selected]?.coords || ""}
            onChange={(e) =>
              updateCell(selected, "coords", e.target.value)
            }
          />
        </div>
      )}
    </div>
  );
}
