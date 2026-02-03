import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { usePermission } from "../../hooks/usePermission";

const GRID_SIZE = 120;
const ALLIANCE_ID = "SDS";

type HQCell = {
  name: string;
  coords: string;
};

export default function HQMap() {
  const { allowed: canEdit } = usePermission("hq_map_edit", ALLIANCE_ID);

  const [selected, setSelected] = useState<number | null>(null);
  const [cells, setCells] = useState<Record<number, HQCell>>({});
  const [draftName, setDraftName] = useState("");
  const [draftCoords, setDraftCoords] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  /* ---------------- LOAD + REFRESH ---------------- */
  async function loadMap() {
    const { data, error } = await supabase
      .from("hq_map")
      .select("slot_index, name, coords")
      .eq("alliance_id", ALLIANCE_ID);

    if (error) {
      console.error("HQ MAP LOAD ERROR", error);
      return;
    }

    const mapped: Record<number, HQCell> = {};
    data?.forEach(row => {
      mapped[row.slot_index] = {
        name: row.name || "",
        coords: row.coords || ""
      };
    });

    setCells(mapped);
  }

  useEffect(() => {
    loadMap();

    const channel = supabase
      .channel("hq-map-" + ALLIANCE_ID)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "hq_map",
          filter: `alliance_id=eq.${ALLIANCE_ID}`
        },
        () => {
          loadMap();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function openEditor(index: number) {
    if (!canEdit) return;
    setSelected(index);
    setDraftName(cells[index]?.name || "");
    setDraftCoords(cells[index]?.coords || "");
  }

  async function saveCell() {
    if (selected === null || !canEdit) return;

    await supabase.from("hq_map").upsert({
      alliance_id: ALLIANCE_ID,
      slot_index: selected,
      name: draftName,
      coords: draftCoords
    });

    setSelected(null);
  }

  function onDrop(targetIndex: number) {
    if (!canEdit || dragIndex === null || dragIndex === targetIndex) return;

    const a = cells[dragIndex];
    const b = cells[targetIndex];

    Promise.all([
      a &&
        supabase.from("hq_map").upsert({
          alliance_id: ALLIANCE_ID,
          slot_index: targetIndex,
          name: a.name,
          coords: a.coords
        }),
      b &&
        supabase.from("hq_map").upsert({
          alliance_id: ALLIANCE_ID,
          slot_index: dragIndex,
          name: b.name,
          coords: b.coords
        })
    ]);

    setDragIndex(null);
  }

  return (
    <div className='page' style={{
      width: "100vw",
      height: "100vh",
      background: "#0b0b0b",
      padding: 20,
      overflow: "auto"
    }}>
      <h2 style={{ color: "#7cff00" }}>
        Alliance HQ Map {canEdit ? "" : "(View Only)"}
      </h2>

      <div className='page' style={{
        display: "grid",
        gridTemplateColumns: "repeat(12, 80px)",
        gap: 8,
        marginTop: 20
      }}>
        {Array.from({ length: GRID_SIZE }).map((_, i) => (
          <div className='page'
            key={i}
            draggable={canEdit}
            onDragStart={() => canEdit && setDragIndex(i)}
            onDragOver={e => canEdit && e.preventDefault()}
            onDrop={() => onDrop(i)}
            onClick={() => openEditor(i)}
            style={{
              width: 80,
              height: 80,
              background: selected === i ? "#1aff00" : "#1f1f1f",
              border: "1px solid #333",
              color: selected === i ? "#000" : "#7cff00",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: canEdit ? "grab" : "default",
              fontSize: 10,
              textAlign: "center",
              padding: 4,
              opacity: canEdit ? 1 : 0.75
            }}
          >
            <strong>{cells[i]?.name || `#${i + 1}`}</strong>
            <span>{cells[i]?.coords || ""}</span>
          </div>
        ))}
      </div>

      {selected !== null && canEdit && (
        <div className='page' style={{
          position: "fixed",
          right: 20,
          top: 100,
          background: "#111",
          border: "1px solid #333",
          padding: 16,
          width: 260,
          color: "#7cff00"
        }}>
          <h3>Edit HQ Spot #{selected + 1}</h3>

          <input
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
            placeholder="Player / Building"
            style={{ width: "100%", marginBottom: 10 }}
          />

          <input
            value={draftCoords}
            onChange={e => setDraftCoords(e.target.value)}
            placeholder="S789 X:222 Y:486"
            style={{ width: "100%", marginBottom: 10 }}
          />

          <button onClick={saveCell} style={{ width: "100%" }}>
            Save
          </button>
        </div>
      )}
    </div>
  );
}

