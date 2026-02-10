import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useMyAlliances } from "../../hooks/useMyAlliances";

type HQCell = {
  player_name: string;
  coords: string;
};

const DEFAULT_SIZE = 120;
const GRID_COLS = 13;
const GRID_ROWS = 11;

export default function HQMap() {
  const { alliances } = useMyAlliances();
  const activealliance_id = alliances?.[0]?.alliance_id || null;
  const myRole = alliances?.[0]?.role_label || "Member";
  const canEdit = myRole === "Owner" || myRole === "Mod";

  const [hqSize, setHqSize] = useState<number>(DEFAULT_SIZE);
  const [editLocked, setEditLocked] = useState<boolean>(false);

  const [selected, setSelected] = useState<number | null>(null);
  const [cells, setCells] = useState<Record<number, HQCell>>({});

  const [draftName, setDraftName] = useState("");
  const [draftCoords, setDraftCoords] = useState("");

  const saveTimer = useRef<number | null>(null);

  const indices = useMemo(() => Array.from({ length: hqSize }, (_, i) => i), [hqSize]);

  // ----------------------------
  // Load map state (size + lock)
  // ----------------------------
  useEffect(() => {
  (async () => {
    const { data } = await supabase.from('hq_slots').select('*').eq('alliance_id', activealliance_id);
    if (data) {
      const map = {};
      data.forEach(r => {
        map[r.slot_index] = {
          name: r.player_name,
          coords: r.coords
        };
      });
      setCells(map);
    }
  })();
}, []);

useEffect(() => {
    if (!activealliance_id) return;

    supabase
      .from("hq_map_state")
      .select("hq_size, edit_locked")
      .eq("alliance_id", activealliance_id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) return;
        if (data?.hq_size) setHqSize(data.hq_size);
        if (typeof data?.edit_locked === "boolean") setEditLocked(data.edit_locked);
      });

  }, [activealliance_id]);

  // Persist state (Owner only)
  useEffect(() => {
  (async () => {
    const { data } = await supabase.from('hq_slots').select('*').eq('alliance_id', activealliance_id);
    if (data) {
      const map = {};
      data.forEach(r => {
        map[r.slot_index] = {
          name: r.player_name,
          coords: r.coords
        };
      });
      setCells(map);
    }
  })();
}, []);

useEffect(() => {
    if (!activealliance_id) return;
    if (myRole !== "Owner") return;

    supabase
      .from("hq_map_state")
      .upsert({
        alliance_id: activealliance_id,
        hq_size: hqSize,
        edit_locked: editLocked,
        updated_at: new Date().toISOString()
      })
      .then(() => {});
  }, [activealliance_id, hqSize, editLocked, myRole]);

  // ----------------------------
  // Load cells from Supabase
  // ----------------------------
  useEffect(() => {
  (async () => {
    const { data } = await supabase.from('hq_slots').select('*').eq('alliance_id', activealliance_id);
    if (data) {
      const map = {};
      data.forEach(r => {
        map[r.slot_index] = {
          name: r.player_name,
          coords: r.coords
        };
      });
      setCells(map);
    }
  })();
}, []);

useEffect(() => {
    if (!activealliance_id) return;

    supabase
      .from("hq_map_cells")
      .select("slot_index, player_name, coords")
      .eq("alliance_id", activealliance_id)
      .then(({ data, error }) => {
        if (error) return;

        const next: Record<number, HQCell> = {};
        (data || []).forEach((row: any) => {
          next[row.slot_index] = {
            player_name: row.player_name || "",
            coords: row.coords || ""
          };
        });

        setCells(next);
      });
  }, [activealliance_id]);

  // ----------------------------
  // Open editor (loads drafts)
  // ----------------------------
  function openEditor(index: number) {
    setSelected(index);
    const c = cells[index] || { player_name: "", coords: "" };
    setDraftName(c.player_name || "");
    setDraftCoords(c.coords || "");
  }

  // ----------------------------
  // Debounced save of a cell
  // ----------------------------
  function queueSaveCell(index: number, nextCell: HQCell) {
    if (!activealliance_id) return;
    if (!canEdit || editLocked) return;

    if (saveTimer.current) window.clearTimeout(saveTimer.current);

    saveTimer.current = window.setTimeout(() => {
      supabase
        .from("hq_map_cells")
        .upsert({
          alliance_id: activealliance_id,
          slot_index: index,
          player_name: nextCell.player_name || "",
          coords: nextCell.coords || "",
          updated_at: new Date().toISOString()
        })
        .then(() => {});
    }, 250);
  }

  // ----------------------------
  // Live update drafts + tile + persist
  // (THIS is what fixes your issue)
  // ----------------------------
  function onChangeName(v: string) {
    setDraftName(v);

    if (selected === null) return;

    setCells(prev => {
      const nextCell: HQCell = {
        player_name: v,
        coords: prev[selected]?.coords ?? draftCoords ?? ""
      };
      const copy = { ...prev, [selected]: nextCell };
      queueSaveCell(selected, nextCell);
      return copy;
    });
  }

  function onChangeCoords(v: string) {
    setDraftCoords(v);

    if (selected === null) return;

    setCells(prev => {
      const nextCell: HQCell = {
        player_name: prev[selected]?.player_name ?? draftName ?? "",
        coords: v
      };
      const copy = { ...prev, [selected]: nextCell };
      queueSaveCell(selected, nextCell);
      return copy;
    });
  }

  // ----------------------------
  // Owner add/remove HQ spots
  // ----------------------------
  function addSpot() {
    if (myRole !== "Owner") return;
    setHqSize(v => v + 1);
  }

  function removeSpot() {
    if (myRole !== "Owner") return;
    setCells(prev => {
      const copy = { ...prev };
      delete copy[hqSize - 1];
      return copy;
    });
    setHqSize(v => Math.max(1, v - 1));
  }

  // ----------------------------
  // Minimal style matching your screenshot vibe
  // (kept simple; does not change behavior)
  // ----------------------------
  const pageStyle: React.CSSProperties = {
    padding: 16
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  };

  const controlsStyle: React.CSSProperties = {
    display: "flex",
    gap: 8,
    alignItems: "center"
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
    gap: 8,
    width: "min(1100px, 100%)"
  };

  const tileBase: React.CSSProperties = {
    borderRadius: 10,
    padding: 10,
    minHeight: 58,
    cursor: "pointer",
    userSelect: "none"
  };

  const editorWrap: React.CSSProperties = {
    marginTop: 16,
    width: "min(1100px, 100%)",
    borderRadius: 10,
    padding: 12
  };

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>HQ Map</div>
          <div style={{ opacity: 0.8, fontSize: 12 }}>
            Grid: {GRID_COLS}×{GRID_ROWS} • Spots: {hqSize}
          </div>
        </div>

        <div style={controlsStyle}>
          {myRole === "Owner" && (
            <>
              <button onClick={addSpot}>➕ Add HQ Spot</button>
              <button onClick={removeSpot}>➖ Remove HQ Spot</button>
              <button onClick={() => setEditLocked(v => !v)}>
                {editLocked ? "🔒 Unlock HQ Edit" : "🔓 Lock HQ Edit"}
              </button>
            </>
          )}
        </div>
      </div>

      <div style={gridStyle}>
        {indices.map(i => {
          const c = cells[i];
          const isSelected = selected === i;

          return (
            <div
              key={i}
              onClick={() => openEditor(i)}
              style={{
                ...tileBase,
                border: isSelected ? "2px solid #a855f7" : "1px solid rgba(255,255,255,0.18)",
                background: isSelected ? "rgba(168,85,247,0.14)" : "rgba(0,0,0,0.24)"
              }}
              title={"Slot"}
            >
              <div style={{ fontWeight: 650, fontSize: 12, marginBottom: 2 }}>
                {c?.player_name || ""}
              </div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>
                {c?.coords || ""}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          ...editorWrap,
          border: "1px solid rgba(255,255,255,0.18)",
          background: "rgba(0,0,0,0.22)"
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          {selected === null ? "Select a slot" : "Editing Slot"}
        </div>

        {selected !== null && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "" + 'repeat(, 1fr)' + "", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, marginBottom: 6, opacity: 0.85 }}>Player Name</div>
                <input
                  value={draftName}
                  onChange={(e) => onChangeName(e.target.value)}
                  disabled={!canEdit || editLocked}
                  style={{ width: "100%", padding: 10, borderRadius: 8 }}
                  placeholder="Type player name…"
                />
              </div>

              <div>
                <div style={{ fontSize: 12, marginBottom: 6, opacity: 0.85 }}>Coordinates</div>
                <input
                  value={draftCoords}
                  onChange={(e) => onChangeCoords(e.target.value)}
                  disabled={!canEdit || editLocked}
                  style={{ width: "100%", padding: 10, borderRadius: 8 }}
                  placeholder="Example: D7 / C-12 …"
                />
              </div>
            </div>

            <div style={{ marginTop: 10, opacity: 0.85, fontSize: 12 }}>
              Autosaves while typing • {canEdit ? (editLocked ? "Edits locked" : "Edits enabled") : "Read-only"}
            </div>
          </>
        )}
      </div>
    </div>
  );
}











