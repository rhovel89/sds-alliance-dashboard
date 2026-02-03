import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useMyAlliances } from "../../hooks/useMyAlliances";
import "../../styles/hq-map.css";

type HQCell = {
  player_name: string;
  coords: string;
};

const COLUMNS = 13;
const ROWS = 11;
const DEFAULT_SLOTS = 120;

export default function HQMap() {
  // ----------------------------------
  // Alliance context (REQUIRED)
  // ----------------------------------
  const { alliances } = useMyAlliances();
  const activeAllianceId = alliances?.[0]?.alliance_id ?? null;

  // ----------------------------------
  // State
  // ----------------------------------
  const [hqSize, setHqSize] = useState(DEFAULT_SLOTS);
  const [cells, setCells] = useState<Record<number, HQCell>>({});
  const [selected, setSelected] = useState<number | null>(null);

  const saveTimer = useRef<number | null>(null);

  const indices = useMemo(
    () => Array.from({ length: hqSize }, (_, i) => i),
    [hqSize]
  );

  // ----------------------------------
  // LOAD HQ SLOTS FROM DB
  // ----------------------------------
  useEffect(() => {
    if (!activeAllianceId) return;

    (async () => {
      const { data, error } = await supabase
        .from("hq_slots")
        .select("*")
        .eq("alliance_id", activeAllianceId);

      if (error || !data) return;

      const map: Record<number, HQCell> = {};
      data.forEach((r) => {
        map[r.slot_index] = {
          player_name: r.player_name ?? "",
          coords: r.coords ?? ""
        };
      });

      setCells(map);
    })();
  }, [activeAllianceId]);

  // ----------------------------------
  // DEBOUNCED AUTOSAVE
  // ----------------------------------
  function saveCell(index: number, cell: HQCell) {
    if (!activeAllianceId) return;

    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }

    saveTimer.current = window.setTimeout(async () => {
      await supabase.from("hq_slots").upsert({
        alliance_id: activeAllianceId,
        slot_index: index,
        player_name: cell.player_name,
        coords: cell.coords
      });
    }, 300);
  }

  function updateCell(index: number, field: keyof HQCell, value: string) {
    setCells((prev) => {
      const next: HQCell = {
        player_name: prev[index]?.player_name ?? "",
        coords: prev[index]?.coords ?? "",
        [field]: value
      };

      saveCell(index, next);

      return {
        ...prev,
        [index]: next
      };
    });
  }

  // ----------------------------------
  // RENDER
  // ----------------------------------
  return (
    <div className="hq-map-wrapper">
      <div className="hq-map-controls">
        <button onClick={() => setHqSize((v) => v + 1)}>➕ Add HQ Spot</button>
        <button onClick={() => setHqSize((v) => (v > 1 ? v - 1 : v))}>
          ➖ Remove HQ Spot
        </button>
        <span>
          {hqSize} / {COLUMNS * ROWS} slots
        </span>
      </div>

      <div
        className="hq-map-grid"
        style={{
          gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`
        }}
      >
        {indices.map((i) => (
          <div
            key={i}
            className={`hq-cell ${selected === i ? "active" : ""}`}
            onClick={() => setSelected(i)}
          >
            <div className="hq-title">
              {cells[i]?.player_name || ""}
            </div>
            <div className="hq-coords">
              {cells[i]?.coords || "—"}
            </div>
          </div>
        ))}
      </div>

      {selected !== null && (
        <div className="hq-editor">
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
