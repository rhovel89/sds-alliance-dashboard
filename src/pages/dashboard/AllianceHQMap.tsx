import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";

type HQSlot = {
  id: string;
  alliance_id: string;
  slot_x: number | null;
  slot_y: number | null;
  label: string | null;
  created_at?: string;
};

function parseCoords(input: string): { x: number; y: number } | null {
  const cleaned = input.trim().replace(/[()]/g, "");
  if (!cleaned) return null;

  const parts = cleaned.split(/[, ]+/).filter(Boolean);
  if (parts.length < 2) return null;

  const x = Number(parts[0]);
  const y = Number(parts[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  return { x: Math.round(x), y: Math.round(y) };
}

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = (alliance_id || "").toUpperCase();
  const { canEdit } = useHQPermissions(upperAlliance);

  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<HQSlot[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Editor state (cell is 1-based)
  const [open, setOpen] = useState(false);
  const [activeCell, setActiveCell] = useState<number>(1);
  const [name, setName] = useState("");
  const [coords, setCoords] = useState("");

  const CELL_COUNT = 36;

  const slotsByCell = useMemo(() => {
    // We map slots -> cells by stable order (created_at then id).
    // Cell #N corresponds to slots[N-1] if present.
    const sorted = [...slots].sort((a, b) => {
      const ac = a.created_at || "";
      const bc = b.created_at || "";
      if (ac < bc) return -1;
      if (ac > bc) return 1;
      return a.id.localeCompare(b.id);
    });
    return sorted;
  }, [slots]);

  const getCellSlot = (cell: number): HQSlot | null => {
    const idx = cell - 1;
    return slotsByCell[idx] || null;
  };

  const load = async () => {
    if (!upperAlliance) return;
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", upperAlliance);

    if (error) {
      setError(error.message);
      setSlots([]);
    } else {
      setSlots((data as HQSlot[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!upperAlliance) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upperAlliance]);

  const openEditor = (cell: number) => {
    const slot = getCellSlot(cell);
    setActiveCell(cell);
    setName(slot?.label || "");
    const x = slot?.slot_x;
    const y = slot?.slot_y;
    setCoords(
      typeof x === "number" && typeof y === "number" ? `(${x},${y})` : ""
    );
    setOpen(true);
  };

  const closeEditor = () => setOpen(false);

  const saveCell = async () => {
    if (!canEdit) return;

    const parsed = parseCoords(coords);
    const slot = getCellSlot(activeCell);

    // If user leaves coords blank, we store 0,0 (safe with bounds + NOT NULL setups)
    const x = parsed ? parsed.x : 0;
    const y = parsed ? parsed.y : 0;

    // If the cell already has a row -> update it
    if (slot) {
      const { error } = await supabase
        .from("alliance_hq_map")
        .update({
          label: name.trim() ? name.trim() : null,
          slot_x: x,
          slot_y: y
        })
        .eq("id", slot.id);

      if (error) {
        alert("Save failed: " + error.message);
        return;
      }
    } else {
      // Otherwise create a new row for this alliance (fills the next empty cell in our display order)
      const { error } = await supabase.from("alliance_hq_map").insert({
        alliance_id: upperAlliance,
        label: name.trim() ? name.trim() : null,
        slot_x: x,
        slot_y: y
      });

      if (error) {
        alert("Add failed: " + error.message);
        return;
      }
    }

    await load();
    closeEditor();
  };

  const clearCell = async () => {
    if (!canEdit) return;
    const slot = getCellSlot(activeCell);
    if (!slot) {
      closeEditor();
      return;
    }

    const ok = confirm("Delete this HQ slot? This cannot be undone.");
    if (!ok) return;

    const { error } = await supabase
      .from("alliance_hq_map")
      .delete()
      .eq("id", slot.id);

    if (error) {
      alert("Delete failed: " + error.message);
      return;
    }

    await load();
    closeEditor();
  };

  const addNewCell = () => {
    // Find first empty cell (no slot row)
    for (let i = 1; i <= CELL_COUNT; i++) {
      if (!getCellSlot(i)) {
        openEditor(i);
        return;
      }
    }
    alert("All cells are filled.");
  };

  return (
    <div style={{ padding: 24, color: "#caffca" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>HQ Map</h1>

        {canEdit ? (
          <span
            style={{
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: 8,
              border: "1px solid #3cff3c",
              color: "#3cff3c",
              opacity: 0.9
            }}
          >
            Unlocked (click a cell to edit)
          </span>
        ) : (
          <span
            style={{
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: 8,
              border: "1px solid #666",
              color: "#aaa",
              opacity: 0.9
            }}
          >
            View only
          </span>
        )}

        <div style={{ flex: 1 }} />

        {canEdit && (
          <button
            onClick={addNewCell}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #3cff3c",
              background: "rgba(0,0,0,0.2)",
              color: "#caffca",
              cursor: "pointer"
            }}
          >
            + Add Cell
          </button>
        )}
      </div>

      <div style={{ marginTop: 8, opacity: 0.7, fontSize: 13 }}>
        Alliance: <b>{upperAlliance || "—"}</b>
      </div>

      {error && (
        <div style={{ marginTop: 12, color: "#ff8080" }}>
          Error: {error}
        </div>
      )}

      {loading ? (
        <div style={{ marginTop: 16, opacity: 0.7 }}>Loading…</div>
      ) : (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(0,0,0,0.25)"
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, minmax(120px, 1fr))",
              gap: 12
            }}
          >
            {Array.from({ length: CELL_COUNT }).map((_, idx) => {
              const cell = idx + 1;
              const slot = getCellSlot(cell);

              const label = slot?.label?.trim() ? slot.label : `#${cell}`;
              const hasCoords =
                typeof slot?.slot_x === "number" && typeof slot?.slot_y === "number";
              const coordsText = hasCoords
                ? `(${slot!.slot_x}, ${slot!.slot_y})`
                : "(no coords)";

              return (
                <button
                  key={cell}
                  onClick={() => (canEdit ? openEditor(cell) : undefined)}
                  style={{
                    textAlign: "left",
                    minHeight: 72,
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(0,0,0,0.30)",
                    color: "#caffca",
                    cursor: canEdit ? "pointer" : "default",
                    boxShadow: "0 0 0 1px rgba(0,0,0,0.25) inset"
                  }}
                  title={canEdit ? "Click to edit" : ""}
                >
                  <div style={{ fontSize: 12, opacity: 0.65 }}>
                    Cell {cell}
                  </div>
                  <div style={{ marginTop: 4, fontWeight: 700 }}>
                    {label}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                    {coordsText}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Editor */}
      {open && (
        <div
          style={{
            marginTop: 18,
            padding: 16,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.35)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h3 style={{ margin: 0 }}>Edit Cell #{activeCell}</h3>
            <div style={{ flex: 1 }} />
            <button
              onClick={closeEditor}
              style={{
                padding: "6px 10px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "transparent",
                color: "#caffca",
                cursor: "pointer"
              }}
            >
              Close
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Name</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="HQ name"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.25)",
                  color: "#caffca",
                  outline: "none"
                }}
              />
            </div>

            <div>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Coords</div>
              <input
                value={coords}
                onChange={(e) => setCoords(e.target.value)}
                placeholder="e.g. (405,382)"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.25)",
                  color: "#caffca",
                  outline: "none"
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button
              disabled={!canEdit}
              onClick={saveCell}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #3cff3c",
                background: "rgba(0,0,0,0.20)",
                color: "#caffca",
                cursor: canEdit ? "pointer" : "not-allowed",
                opacity: canEdit ? 1 : 0.5
              }}
            >
              Save
            </button>

            <button
              disabled={!canEdit}
              onClick={clearCell}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid rgba(255,80,80,0.9)",
                background: "rgba(0,0,0,0.20)",
                color: "#ffb3b3",
                cursor: canEdit ? "pointer" : "not-allowed",
                opacity: canEdit ? 1 : 0.5
              }}
            >
              Clear Cell (Delete)
            </button>

            <div style={{ flex: 1 }} />

            <button
              onClick={load}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "transparent",
                color: "#caffca",
                cursor: "pointer"
              }}
            >
              Refresh
            </button>
          </div>

          <div style={{ marginTop: 10, opacity: 0.6, fontSize: 12 }}>
            Saving writes to <code>alliance_hq_map</code>. Refreshing the page will show the saved data.
          </div>
        </div>
      )}
    </div>
  );
}
