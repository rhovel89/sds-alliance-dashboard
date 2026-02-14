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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftPX, setDraftPX] = useState("");
  const [draftPY, setDraftPY] = useState("");

  const editingSlot = useMemo(
    () => slots.find(s => s.id === editingId) || null,
    [slots, editingId]
  );

  const slotByCell = useMemo(() => {
    const map = new Map<string, HQSlot>();
    slots.forEach(s => map.set(keyFor(s.slot_x, s.slot_y), s));
    return map;
  }, [slots]);

  useEffect(() => {
    if (!upperAlliance) return;

    const load = async () => {
      const { data } = await supabase
        .from("alliance_hq_map")
        .select("*")
        .eq("alliance_id", upperAlliance);

      if (data) setSlots(data);
    };

    load();
  }, [upperAlliance]);

  const saveEditor = async () => {
    if (!editingSlot) return;

    const payload = {
      label: draftLabel.trim() || null,
      player_x: draftPX ? Number(draftPX) : null,
      player_y: draftPY ? Number(draftPY) : null,
    };

    await supabase
      .from("alliance_hq_map")
      .update(payload)
      .eq("id", editingSlot.id);

    setSlots(prev =>
      prev.map(s =>
        s.id === editingSlot.id ? { ...s, ...payload } : s
      )
    );

    setEditingId(null);
  };

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ color: "#7CFF5B" }}>HQ Map — {upperAlliance}</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${GRID_W}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${GRID_H}, ${CELL_SIZE}px)`,
          gap: 8,
        }}
      >
        {Array.from({ length: GRID_H }).map((_, y) =>
          Array.from({ length: GRID_W }).map((__, x) => {
            const slot = slotByCell.get(keyFor(x, y));

            return (
              <div
                key={`${x}-${y}`}
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  borderRadius: 16,
                  border: "2px solid rgba(0,255,0,0.6)",
                  background: slot
                    ? "rgba(0,40,0,0.9)"
                    : "rgba(255,255,255,0.05)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 10,
                  boxSizing: "border-box",
                  color: "#7CFF5B",
                  overflow: "hidden",
                }}
                onDoubleClick={() => {
                  if (!canEdit || !slot) return;
                  setEditingId(slot.id);
                  setDraftLabel(slot.label || "");
                  setDraftPX(slot.player_x?.toString() || "");
                  setDraftPY(slot.player_y?.toString() || "");
                }}
              >
                {slot && (
                  <>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 12,
                        lineHeight: "14px",
                        textAlign: "center",
                        wordBreak: "break-word",
                        overflowWrap: "anywhere",
                        maxHeight: 55,
                        overflow: "hidden",
                      }}
                    >
                      {slot.label}
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        opacity: 0.8,
                        textAlign: "center",
                      }}
                    >
                      {slot.player_x ?? "-"}, {slot.player_y ?? "-"}
                    </div>
                  </>
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
            onChange={e => setDraftLabel(e.target.value)}
            placeholder="HQ Name"
          />
          <input
            value={draftPX}
            onChange={e => setDraftPX(e.target.value)}
            placeholder="Player X"
          />
          <input
            value={draftPY}
            onChange={e => setDraftPY(e.target.value)}
            placeholder="Player Y"
          />
          <button onClick={saveEditor}>Save</button>
        </div>
      )}
    </div>
  );
}
