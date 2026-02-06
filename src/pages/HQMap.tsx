import { useEffect, useState } from "react";
import { useSession } from "../hooks/useSession";
import "../styles/hq-map-zombie.css";



const COLUMNS = 13;
const ROWS = 11;

type Cell = {
  player_name?: string;
  coords?: string;
};

function storageKey(allianceId: string) {
  return "hqmap:" + allianceId;
}

export default function HQMap() {
  const { session } = useSession();
  

  if (!activeAllianceId) {
    return (
      <div style={{ padding: 40, color: "#9fef00", fontFamily: "monospace" }}>
        ⚠ No active alliance selected.<br />
        
      </div>
    );
  }
  const [cells, setCells] = useState<Cell[]>(
    Array.from({ length: COLUMNS * ROWS }, () => ({}))
  );
  const [selected, setSelected] = useState<number | null>(null);

  const activeAllianceId = localStorage.getItem("activeAllianceId");

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(activeAllianceId));
      if (raw) {
        setCells(JSON.parse(raw));
      }
    } catch (e) {
      console.error("[HQMap] load error", e);
    }
  }, [activeAllianceId]);

  function updateCell(index: number, field: keyof Cell, value: string) {
    const next = [...cells];
    next[index] = { ...next[index], [field]: value };
    setCells(next);

    try {
      localStorage.setItem(storageKey(activeAllianceId), JSON.stringify(next));
    } catch {}
  }

  return (
    <div className="hq-map-page zombie-hq-map">`n<div className="hq-fog"></div>
      <h2 className="hq-map-title">🧟 Alliance HQ Map</h2>

      <div
        className="hq-map-grid"
        style={{
          gridTemplateColumns: "repeat(" + COLUMNS + ", 1fr)",
        }}
      >
        {cells.map((_, i) => (
          <div
            key={i}
            className={`hq-cell ${!isOwner ? "hq-readonly" : ""} ${selected === i ? "selected" : ""} ${cells[i]?.player_name ? "ally" : "empty"}`}
            onClick={() => { if (isOwner || isMod || cells[i]?.hq_role === "officer") setSelected(i); }}
          >
            <div className="hq-title">{cells[i]?.player_name || ""}</div>
            <div className="hq-coords">{cells[i]?.coords || "—"}</div>
          </div>
        ))}
      </div>

      {selected !== null && (isOwner || isMod || cells[selected]?.hq_role === "officer") && (isOwner || isMod || cells[selected]?.hq_role === "officer") && isOwner && (
        <div className="hq-editor survivor-terminal">
          <h4>HQ {selected + 1}</h4>

          <input
            placeholder="Player Game Name"
            value={cells[selected]?.player_name || ""}
            onChange={(e) =>
              updateCell(selected, "player_name", e.target.value)
            }
          />

          <input
            placeholder="Coordinates (e.g. X:123 Y:456)"
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






























