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

const keyFor = (x: number, y: number) => `${x},${y}`;

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = (alliance_id || "").toUpperCase();
  const { canEdit } = useHQPermissions(upperAlliance);

  const [slots, setSlots] = useState<HQSlot[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftPX, setDraftPX] = useState("");
  const [draftPY, setDraftPY] = useState("");

  const editingSlot = useMemo(
    () => slots.find((s) => s.id === editingId) || null,
    [slots, editingId]
  );

  const slotByCell = useMemo(() => {
    const m = new Map<string, HQSlot>();
    slots.forEach((s) => m.set(keyFor(s.slot_x, s.slot_y), s));
    return m;
  }, [slots]);

  const refetch = async () => {
    if (!upperAlliance) return;
    const { data } = await supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", upperAlliance);

    if (data) setSlots(data);
  };

  useEffect(() => {
    refetch();
  }, [upperAlliance]);

  const addSlot = async () => {
    if (!canEdit) return;

    const payload = {
      alliance_id: upperAlliance,
      slot_x: 0,
      slot_y: 0,
      label: "New HQ",
      player_x: null,
      player_y: null,
      slot_number: 1,
    };

    const { data } = await supabase
      .from("alliance_hq_map")
      .insert(payload)
      .select()
      .single();

    if (data) setSlots((prev) => [...prev, data]);
  };

  const deleteSlot = async (id: string) => {
    if (!canEdit) return;
    await supabase.from("alliance_hq_map").delete().eq("id", id);
    setSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const saveEditor = async () => {
    if (!editingSlot) return;

    await supabase
      .from("alliance_hq_map")
      .update({
        label: draftLabel,
        player_x: draftPX ? Number(draftPX) : null,
        player_y: draftPY ? Number(draftPY) : null,
      })
      .eq("id", editingSlot.id);

    await refetch();
    setEditingId(null);
  };

  if (!upperAlliance) return null;

  return (
    <div style={{ padding: 30 }}>
      <div style={{ display: "flex", gap: 15, marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>HQ Map — {upperAlliance}</h2>
        {canEdit && (
          <button onClick={addSlot}>Add HQ Slot</button>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${GRID_W}, ${CELL}px)`,
          gridTemplateRows: `repeat(${GRID_H}, ${CELL}px)`,
          gap: 14,
        }}
      >
        {Array.from({ length: GRID_H }).map((_, y) =>
          Array.from({ length: GRID_W }).map((__, x) => {
            const slot = slotByCell.get(keyFor(x, y));

            return (
              <div
                key={`${x}-${y}`}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 20,
                  border: "2px solid rgba(0,255,0,0.6)",
                  background: slot
                    ? "rgba(0,40,0,0.9)"
                    : "rgba(255,255,255,0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: 12,
                  color: "#8aff8a",
                  fontSize: 11,
                  boxShadow: slot
                    ? "0 0 18px rgba(0,255,0,0.35)"
                    : "none",
                  position: "relative",
                }}
              >
                {!slot && <span>{x},{y}</span>}

                {slot && (
                  <div style={{ width: "100%" }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 12,
                        wordBreak: "break-word",
                        lineHeight: "14px",
                      }}
                    >
                      {slot.label || "HQ"}
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 10,
                        opacity: 0.85,
                      }}
                    >
                      {slot.player_x ?? "-"}, {slot.player_y ?? "-"}
                    </div>

                    {canEdit && (
                      <button
                        onClick={() => deleteSlot(slot.id)}
                        style={{
                          position: "absolute",
                          bottom: 6,
                          right: 6,
                          fontSize: 10,
                          borderRadius: 999,
                        }}
                      >
                        ✖
                      </button>
                    )}

                    {canEdit && (
                      <button
                        onClick={() => {
                          setEditingId(slot.id);
                          setDraftLabel(slot.label || "");
                          setDraftPX(
                            slot.player_x ? String(slot.player_x) : ""
                          );
                          setDraftPY(
                            slot.player_y ? String(slot.player_y) : ""
                          );
                        }}
                        style={{
                          position: "absolute",
                          bottom: 6,
                          left: 6,
                          fontSize: 10,
                          borderRadius: 999,
                        }}
                      >
                        ✎
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
        <div style={{ marginTop: 25 }}>
          <h3>Edit Slot</h3>
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
        </div>
      )}
    </div>
  );
}

