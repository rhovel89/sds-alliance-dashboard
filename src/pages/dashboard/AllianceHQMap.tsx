import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";

type HQSlot = {
  id: string;
  alliance_id: string;
  slot_x: number; // grid col
  slot_y: number; // grid row
  label: string | null;
  player_x: number | null;
  player_y: number | null;
  slot_number: number | null;
};

const GRID_W = 14; // 14 x 11 = 154 slots total
const GRID_H = 11;

const CELL = 100; // visual size (requested)
const GAP = 10;

const keyFor = (x: number, y: number) => `${x},${y}`;

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = (alliance_id || "").toUpperCase();

  const { canEdit } = useHQPermissions(upperAlliance);

  const [slots, setSlots] = useState<HQSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inline editor
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingSlot = useMemo(
    () => slots.find((s) => s.id === editingId) || null,
    [slots, editingId]
  );

  const [draftLabel, setDraftLabel] = useState("");
  const [draftPX, setDraftPX] = useState<string>("");
  const [draftPY, setDraftPY] = useState<string>("");

  const slotByCell = useMemo(() => {
    const m = new Map<string, HQSlot>();
    for (const s of slots) m.set(keyFor(s.slot_x, s.slot_y), s);
    return m;
  }, [slots]);

  const refetch = async () => {
    if (!upperAlliance) return;
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("alliance_hq_map")
      .select("id, alliance_id, slot_x, slot_y, label, player_x, player_y, slot_number")
      .eq("alliance_id", upperAlliance);

    if (error) {
      console.error("HQ MAP SELECT ERROR:", error);
      setErrorMsg(error.message);
      setSlots([]);
      setLoading(false);
      return;
    }

    setSlots((data || []) as HQSlot[]);
    setLoading(false);
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upperAlliance]);

  const openEditor = (slot: HQSlot) => {
    setEditingId(slot.id);
    setDraftLabel(slot.label || "");
    setDraftPX(slot.player_x == null ? "" : String(slot.player_x));
    setDraftPY(slot.player_y == null ? "" : String(slot.player_y));
  };

  const closeEditor = () => {
    setEditingId(null);
    setDraftLabel("");
    setDraftPX("");
    setDraftPY("");
  };

  const saveEditor = async () => {
    if (!editingSlot || !canEdit) return;

    const px = draftPX.trim() === "" ? null : Number(draftPX);
    const py = draftPY.trim() === "" ? null : Number(draftPY);

    if (px != null && Number.isNaN(px)) return alert("Player X must be a number (or blank).");
    if (py != null && Number.isNaN(py)) return alert("Player Y must be a number (or blank).");

    setBusyId(editingSlot.id);
    setErrorMsg(null);

    const payload: Partial<HQSlot> = {
      label: draftLabel.trim() === "" ? null : draftLabel.trim(),
      player_x: px,
      player_y: py,
    };

    const { error } = await supabase
      .from("alliance_hq_map")
      .update(payload)
      .eq("id", editingSlot.id);

    if (error) {
      console.error("HQ MAP UPDATE ERROR:", error);
      setErrorMsg(error.message);
      setBusyId(null);
      return alert(`Save failed: ${error.message}`);
    }

    setSlots((prev) =>
      prev.map((s) => (s.id === editingSlot.id ? ({ ...s, ...payload } as HQSlot) : s))
    );

    setBusyId(null);
    closeEditor();
  };

  const findFirstEmptyCell = (): { x: number; y: number } | null => {
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (!slotByCell.get(keyFor(x, y))) return { x, y };
      }
    }
    return null;
  };

  const addSlot = async () => {
    if (!canEdit) return;
    if (!upperAlliance) return;

    const cell = findFirstEmptyCell();
    if (!cell) return alert("No empty cells left.");

    setErrorMsg(null);

    const payload = {
      alliance_id: upperAlliance,
      slot_x: cell.x,
      slot_y: cell.y,
      label: "New HQ",
      player_x: null,
      player_y: null,
      slot_number: cell.y * GRID_W + cell.x + 1,
    };

    const { data, error } = await supabase
      .from("alliance_hq_map")
      .insert(payload)
      .select("id, alliance_id, slot_x, slot_y, label, player_x, player_y, slot_number")
      .single();

    if (error) {
      console.error("HQ MAP INSERT ERROR:", error);
      setErrorMsg(error.message);
      return alert(`Add failed: ${error.message}`);
    }

    if (data) setSlots((prev) => [...prev, data as HQSlot]);
    else await refetch();
  };

  const deleteSlot = async (id: string) => {
    if (!canEdit) return;
    if (!confirm("Delete this HQ slot?")) return;

    setBusyId(id);
    setErrorMsg(null);

    const { error } = await supabase.from("alliance_hq_map").delete().eq("id", id);

    if (error) {
      console.error("HQ MAP DELETE ERROR:", error);
      setErrorMsg(error.message);
      setBusyId(null);
      return alert(`Delete failed: ${error.message}`);
    }

    setSlots((prev) => prev.filter((s) => s.id !== id));
    setBusyId(null);
    if (editingId === id) closeEditor();
  };

  const moveSlotToCell = async (id: string, x: number, y: number) => {
    if (!canEdit) return;

    const occupying = slotByCell.get(keyFor(x, y));
    if (occupying && occupying.id !== id) return;

    setBusyId(id);
    setErrorMsg(null);

    const { error } = await supabase
      .from("alliance_hq_map")
      .update({ slot_x: x, slot_y: y, slot_number: y * GRID_W + x + 1 })
      .eq("id", id);

    if (error) {
      console.error("HQ MAP MOVE ERROR:", error);
      setErrorMsg(error.message);
      setBusyId(null);
      return alert(`Move failed: ${error.message}`);
    }

    setSlots((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, slot_x: x, slot_y: y, slot_number: y * GRID_W + x + 1 } : s
      )
    );
    setBusyId(null);
  };

  const onDragStart = (e: React.DragEvent, slot: HQSlot) => {
    if (!canEdit) return;
    e.dataTransfer.setData("text/plain", slot.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDropCell = async (e: React.DragEvent, x: number, y: number) => {
    if (!canEdit) return;
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    await moveSlotToCell(id, x, y);
  };

  if (!upperAlliance) {
    return <div style={{ padding: 24 }}>Missing alliance in URL.</div>;
  }

  return (
    <div
      style={{
        padding: 24,
        background: "rgba(0,0,0,0.35)",
        minHeight: "100vh",
        color: "#b6ff9e",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 14 }}>🧟 HQ Map — {upperAlliance}</h1>

        {canEdit ? (
          <button className="zombie-btn" style={{ padding: "8px 12px", fontSize: 14 }} onClick={addSlot}>
            ➕ Add HQ Slot
          </button>
        ) : (
          <span style={{ opacity: 0.7, fontSize: 14 }}>View-only</span>
        )}

        {loading && <span style={{ opacity: 0.7, fontSize: 14 }}>Loading…</span>}
        {errorMsg && <span style={{ color: "#ff6464", fontSize: 14 }}>{errorMsg}</span>}
      </div>

      <div style={{ overflowX: "auto", paddingTop: 6 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${GRID_W}, ${CELL}px)`,
            gridTemplateRows: `repeat(${GRID_H}, ${CELL}px)`,
            gap: GAP,
            padding: 18,
            borderRadius: 18,
            border: "1px solid rgba(0,255,0,0.20)",
            background: "rgba(0,0,0,0.45)",
            boxShadow: "0 0 25px rgba(0,255,0,0.08)",
            width: "fit-content",
          }}
        >
          {Array.from({ length: GRID_H }).map((_, y) =>
            Array.from({ length: GRID_W }).map((__, x) => {
              const slot = slotByCell.get(keyFor(x, y));
              const isBusy = slot ? busyId === slot.id : false;

              return (
                <div
                  key={`${x}-${y}`}
                  onDragOver={
                    canEdit
                      ? (e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }
                      : undefined
                  }
                  onDrop={canEdit ? (e) => onDropCell(e, x, y) : undefined}
                  style={{
                    width: CELL,
                    height: CELL,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: slot ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.04)",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    userSelect: "none",
                    boxSizing: "border-box",
                  }}
                  title={slot ? `${slot.label || "HQ"} (cell ${x},${y})` : `Empty (${x},${y})`}
                >
                  {!slot && <span style={{ fontSize: 11, opacity: 0.30 }}>{x},{y}</span>}

                  {slot && (
                    <div
                      draggable={canEdit}
                      onDragStart={canEdit ? (e) => onDragStart(e, slot) : undefined}
                      onDoubleClick={() => {
                        if (canEdit) openEditor(slot);
                      }}
                      style={{
                        width: "100%",
                        height: "100%",
                        boxSizing: "border-box",
                        borderRadius: 14,
                        border: "2px solid rgba(0,255,0,0.65)",
                        background: "rgba(0,20,0,0.55)",
                        boxShadow: "0 0 10px rgba(0,255,0,0.25)",
                        color: "#7CFF5B",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "stretch",
                        justifyContent: "space-between",
                        padding: 10,
                        cursor: canEdit ? "grab" : "default",
                        opacity: isBusy ? 0.6 : 1,
                        overflow: "hidden",
                      }}
                    >
                      {/* Delete button (top-right) */}
                      {canEdit && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteSlot(slot.id);
                          }}
                          style={{
                            position: "absolute",
                            top: 6,
                            right: 6,
                            fontSize: 12,
                            padding: "2px 7px",
                            borderRadius: 999,
                            border: "1px solid rgba(255,0,0,0.45)",
                            background: "rgba(255,0,0,0.10)",
                            color: "#ffb3b3",
                            cursor: "pointer",
                            zIndex: 2,
                          }}
                          title="Delete slot"
                        >
                          ✖
                        </button>
                      )}

                      {/* Label (wrap + clamp) */}
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 12,
                          lineHeight: "14px",
                          textAlign: "center",
                          wordBreak: "break-word",
                          overflowWrap: "anywhere",
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          paddingRight: 18, // room for delete button
                        }}
                      >
                        {slot.label || "HQ"}
                      </div>

                      {/* Coordinates area */}
                      <div style={{ fontSize: 11, opacity: 0.9, textAlign: "center" }}>
                        <div style={{ marginTop: 6 }}>
                          PX: {slot.player_x ?? "-"} &nbsp; PY: {slot.player_y ?? "-"}
                        </div>
                        <div style={{ marginTop: 6, fontSize: 10, opacity: 0.75 }}>
                          Cell: {x},{y}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Inline editor panel */}
      {editingSlot && (
        <div
          style={{
            marginTop: 14,
            borderRadius: 12,
            border: "1px solid rgba(0,255,0,0.25)",
            background: "rgba(0,0,0,0.45)",
            padding: 18,
            maxWidth: 520,
          }}
        >
          <div style={{ fontSize: 13, marginBottom: 10, color: "lime" }}>
            Editing cell ({editingSlot.slot_x},{editingSlot.slot_y}) — double-click a slot to edit
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, alignItems: "center" }}>
            <div style={{ opacity: 0.8, fontSize: 12 }}>HQ Name</div>
            <input
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              style={{
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(0,0,0,0.45)",
                color: "white",
                padding: "8px 10px",
                fontSize: 14,
              }}
            />

            <div style={{ opacity: 0.8, fontSize: 12 }}>Player X</div>
            <input
              value={draftPX}
              onChange={(e) => setDraftPX(e.target.value)}
              placeholder="optional"
              style={{
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(0,0,0,0.45)",
                color: "white",
                padding: "8px 10px",
                fontSize: 14,
              }}
            />

            <div style={{ opacity: 0.8, fontSize: 12 }}>Player Y</div>
            <input
              value={draftPY}
              onChange={(e) => setDraftPY(e.target.value)}
              placeholder="optional"
              style={{
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(0,0,0,0.45)",
                color: "white",
                padding: "8px 10px",
                fontSize: 14,
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button
              className="zombie-btn"
              style={{ padding: "8px 12px", fontSize: 14 }}
              onClick={saveEditor}
              disabled={!canEdit || busyId === editingSlot.id}
            >
              💾 Save
            </button>

            <button
              style={{
                padding: "8px 12px",
                fontSize: 14,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
                cursor: "pointer",
              }}
              onClick={closeEditor}
            >
              Cancel
            </button>

            <span style={{ opacity: 0.65, fontSize: 12 }}>
              Tip: drag a slot onto an empty cell to move. Double-click to edit.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
