import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";

type HQSlot = {
  id: string;
  alliance_id: string;
  slot_x: number;
  slot_y: number;
  label: string | null;
  player_x: number | null;
  player_y: number | null;
  slot_number: number | null;
};

const GRID_W = 12;
const GRID_H = 10;
const CELL_SIZE = 100;

const keyFor = (x: number, y: number) => `${x},${y}`;

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = (alliance_id || "").toUpperCase();

  const { canEdit } = useHQPermissions(upperAlliance);

  const [slots, setSlots] = useState<HQSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingSlot = useMemo(
    () => slots.find((s) => s.id === editingId) || null,
    [slots, editingId]
  );

  const [draftLabel, setDraftLabel] = useState("");
  const [draftPX, setDraftPX] = useState("");
  const [draftPY, setDraftPY] = useState("");

  const slotByCell = useMemo(() => {
    const map = new Map<string, HQSlot>();
    slots.forEach((s) => {
      map.set(keyFor(s.slot_x, s.slot_y), s);
    });
    return map;
  }, [slots]);

  useEffect(() => {
    if (!upperAlliance) return;

    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("alliance_hq_map")
        .select("*")
        .eq("alliance_id", upperAlliance);

      if (data) setSlots(data as HQSlot[]);
      setLoading(false);
    };

    load();
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

    setBusyId(editingSlot.id);

    const { error } = await supabase
      .from("alliance_hq_map")
      .update({
        label: draftLabel || null,
        player_x: px,
        player_y: py,
      })
      .eq("id", editingSlot.id);

    if (!error) {
      setSlots((prev) =>
        prev.map((s) =>
          s.id === editingSlot.id
            ? { ...s, label: draftLabel, player_x: px, player_y: py }
            : s
        )
      );
    }

    setBusyId(null);
    closeEditor();
  };

  const deleteSlot = async (id: string) => {
    if (!canEdit) return;
    if (!confirm("Delete this HQ slot?")) return;

    await supabase.from("alliance_hq_map").delete().eq("id", id);
    setSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const addSlot = async () => {
    if (!canEdit) return;

    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (!slotByCell.get(keyFor(x, y))) {
          const { data } = await supabase
            .from("alliance_hq_map")
            .insert({
              alliance_id: upperAlliance,
              slot_x: x,
              slot_y: y,
              label: "New HQ",
            })
            .select()
            .single();

          if (data) setSlots((prev) => [...prev, data as HQSlot]);
          return;
        }
      }
    }
  };

  const moveSlot = async (id: string, x: number, y: number) => {
    if (!canEdit) return;
    if (slotByCell.get(keyFor(x, y))) return;

    await supabase
      .from("alliance_hq_map")
      .update({ slot_x: x, slot_y: y })
      .eq("id", id);

    setSlots((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, slot_x: x, slot_y: y } : s
      )
    );
  };

  const onDragStart = (e: React.DragEvent, slot: HQSlot) => {
    if (!canEdit) return;
    e.dataTransfer.setData("text/plain", slot.id);
  };

  const onDrop = (e: React.DragEvent, x: number, y: number) => {
    if (!canEdit) return;
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) moveSlot(id, x, y);
  };

  if (!upperAlliance) {
    return <div style={{ padding: 24 }}>Missing alliance in URL.</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <h2>HQ Map — {upperAlliance}</h2>
        {canEdit && (
          <button onClick={addSlot} className="zombie-btn">
            ➕ Add HQ Slot
          </button>
        )}
        {loading && <span style={{ marginLeft: 12 }}>Loading...</span>}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${GRID_W}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${GRID_H}, ${CELL_SIZE}px)`,
          gap: 10,
        }}
      >
        {Array.from({ length: GRID_H }).map((_, y) =>
          Array.from({ length: GRID_W }).map((__, x) => {
            const slot = slotByCell.get(keyFor(x, y));

            return (
              <div
                key={`${x}-${y}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, x, y)}
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  border: "2px solid rgba(0,255,0,0.6)",
                  borderRadius: 14,
                  background: slot
                    ? "rgba(0,40,0,0.95)"
                    : "rgba(255,255,255,0.05)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {slot && (
                  <div
                    draggable={canEdit}
                    onDragStart={(e) => onDragStart(e, slot)}
                    onDoubleClick={() => openEditor(slot)}
                    style={{
                      width: "100%",
                      height: "100%",
                      padding: 8,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      textAlign: "center",
                      fontSize: 12,
                      color: "#8aff8a",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        wordBreak: "break-word",
                      }}
                    >
                      {slot.label}
                    </div>

                    <div style={{ fontSize: 11, opacity: 0.8 }}>
                      {slot.player_x ?? "-"}, {slot.player_y ?? "-"}
                    </div>

                    {canEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSlot(slot.id);
                        }}
                        style={{ marginTop: 4 }}
                      >
                        ✖
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {editingSlot && (
        <div style={{ marginTop: 20 }}>
          <input
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            placeholder="HQ Name"
          />
          <input
            value={draftPX}
            onChange={(e) => setDraftPX(e.target.value)}
            placeholder="Player X"
          />
          <input
            value={draftPY}
            onChange={(e) => setDraftPY(e.target.value)}
            placeholder="Player Y"
          />
          <button onClick={saveEditor}>Save</button>
          <button onClick={closeEditor}>Cancel</button>
        </div>
      )}
    </div>
  );
}
