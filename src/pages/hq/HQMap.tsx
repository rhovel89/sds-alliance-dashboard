import { useParams } from "react-router-dom";
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

function storageKey(alliance_id: string) {
  return `hqmap:${alliance_id}`;
}

export default function HQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  // ----------------------------------
  // Alliance context (REQUIRED)
  // ----------------------------------
  const { alliances } = useMyAlliances();
  const activealliance_id = alliances?.[0]?.alliance_id ?? null;

  // ----------------------------------
  // State
  // ----------------------------------
  const [hqSize, setHqSize] = useState(DEFAULT_SLOTS);
  const [cells, setCells] = useState<Record<number, HQCell>>({});
  const [selected, setSelected] = useState<number | null>(null);

  // One timer per slot (prevents edits in one slot canceling another)
  const timersRef = useRef<Record<number, number>>({});

  const indices = useMemo(
    () => Array.from({ length: hqSize }, (_, i) => i),
    [hqSize]
  );

  // ----------------------------------
  // LOAD HQ SLOTS (Supabase -> fallback localStorage)
  // ----------------------------------
  useEffect(() => {
    if (!activealliance_id) return;

    (async () => {
      console.info("[HQMap] load start", { activealliance_id });

      const { data, error } = await supabase
        .from("hq_slots")
        .select("slot_index, player_name, coords")
        .eq("alliance_id", activealliance_id);

      if (error) {
        console.error("[HQMap] load error", error);
      }

      // If Supabase returned rows, use them
      if (data && data.length > 0) {
        const map: Record<number, HQCell> = {};
        data.forEach((r: any) => {
          map[r.slot_index] = {
            player_name: r.player_name ?? "",
            coords: r.coords ?? ""
          };
        });
        setCells(map);

        // Cache to localStorage for safety
        try {
          localStorage.setItem(storageKey(activealliance_id), JSON.stringify(map));
        } catch {}

        console.info("[HQMap] load ok (db)", { rows: data.length });
        return;
      }

      // Fallback: localStorage (prevents refresh wipeouts even if DB blocked)
      try {
        const raw = localStorage.getItem(storageKey(activealliance_id));
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            setCells(parsed);
            console.info("[HQMap] load fallback (localStorage)");
            return;
          }
        }
      } catch {}

      console.info("[HQMap] load ok (empty)");
    })();
  }, [activealliance_id]);

  // ----------------------------------
  // SAVE ONE CELL (debounced per-slot)
  // UPDATE -> INSERT fallback (no unique constraint required)
  // Also writes localStorage immediately
  // ----------------------------------
  function saveCell(index: number, cell: HQCell) {
    if (!activealliance_id) return;

    // Always persist locally immediately (so refresh keeps it)
    setTimeout(() => {
      try {
        const nextAll = { ...cells, [index]: cell };
        localStorage.setItem(storageKey(activealliance_id), JSON.stringify(nextAll));
      } catch {}
    }, 0);

    const timers = timersRef.current;

    if (timers[index]) {
      window.clearTimeout(timers[index]);
    }

    timers[index] = window.setTimeout(async () => {
      console.info("[HQMap] save firing", { activealliance_id, index, cell });

      try {
        const { data: updated, error: updateError } = await supabase
          .from("hq_slots")
          .update({
            player_name: cell.player_name,
            coords: cell.coords
          })
          .eq("alliance_id", activealliance_id)
          .eq("slot_index", index)
          .select("slot_index");

        if (updateError) {
          console.error("[HQMap] save UPDATE error", updateError);
        }

        if (!updated || updated.length === 0) {
          const { error: insertError } = await supabase
            .from("hq_slots")
            .insert({
              alliance_id: activealliance_id,
              slot_index: index,
              player_name: cell.player_name,
              coords: cell.coords
            });

          if (insertError) {
            console.error("[HQMap] save INSERT error", insertError);
          }
        }

        console.info("[HQMap] save done", { activealliance_id, index });
      } catch (e) {
        console.error("[HQMap] save unexpected error", e);
      }
    }, 300);
  }

  function updateCell(index: number, field: keyof HQCell, value: string) {
    setCells((prev) => {
      const current: HQCell = prev[index] ?? { player_name: "", coords: "" };

      // no-op if unchanged
      if ((current as any)[field] === value) return prev;

      const next: HQCell = {
        player_name: current.player_name ?? "",
        coords: current.coords ?? "",
        [field]: value
      } as HQCell;

      const merged = { ...prev, [index]: next };

      // Keep localStorage in sync on every edit
      if (activealliance_id) {
        try {
          localStorage.setItem(storageKey(activealliance_id), JSON.stringify(merged));
        } catch {}
      }

      saveCell(index, next);
      return merged;
    });
  }

    // ================================
  // HQ AUTOSAVE (DEBOUNCED)
  // ================================
  const autosaveTimerRef = useRef<number | null>(null);

  function autosaveSlot(index: number, cell: HQCell) {
    if (!activealliance_id) return;

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(async () => {
      await supabase.from("hq_slots").upsert({
        alliance_id: activealliance_id,
        slot_index: index,
        player_name: cell.player_name,
        coords: cell.coords
      });
    }, 300);
  }
  // HQ_AUTOSAVE_V1

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
            className="hq-cell"
            onClick={() => setSelected(i)}
          >
            <div className="hq-title">{cells[i]?.player_name || ""}</div>
            <div className="hq-coords">{cells[i]?.coords || "—"}</div>
          </div>
        ))}
      </div>

      {selected !== null && (
        <div className="hq-editor">
          <h4>HQ {selected + 1}</h4>

          <input
            placeholder="Player Game Name"
            value={cells[selected]?.player_name || ""}
            onChange={(e) => updateCell(selected, "player_name", e.target.value)}
          />

          <input
            placeholder="Coordinates (e.g. X:123 Y:456)"
            value={cells[selected]?.coords || ""}
            onChange={(e) => updateCell(selected, "coords", e.target.value)}
          />
        </div>
      )}
    </div>
  );
}






