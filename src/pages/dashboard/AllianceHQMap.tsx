import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";

const COLS = 16;
const ROWS = 17;
const CELL_SIZE = 90; // your current good size

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = alliance_id?.toUpperCase() || "";
  const { canEdit } = useHQPermissions(upperAlliance);

  const [slots, setSlots] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  useEffect(() => {
    if (!upperAlliance) return;

    supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", upperAlliance)
      .then(({ data }) => setSlots(data || []));
  }, [upperAlliance]);

  const saveSlot = async () => {
    if (!editing) return;

    await supabase
      .from("alliance_hq_map")
      .update({
        label: editing.label,
        player_x: editing.player_x,
        player_y: editing.player_y,
        updated_at: new Date()
      })
      .eq("id", editing.id);

    setSlots(prev =>
      prev.map(s => (s.id === editing.id ? { ...s, ...editing } : s))
    );

    setEditing(null);
  };

  const deleteSlot = async (id: string) => {
    await supabase
      .from("alliance_hq_map")
      .delete()
      .eq("id", id);

    setSlots(prev => prev.filter(s => s.id !== id));
  };

  const addSlot = async (col: number, row: number) => {
    if (!canEdit) return;

    const { data } = await supabase
      .from("alliance_hq_map")
      .insert({
        alliance_id: upperAlliance,
        slot_x: col,
        slot_y: row,
        slot_number: row * COLS + col
      })
      .select()
      .single();

    if (data) setSlots(prev => [...prev, data]);
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>HQ Map</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
          gap: 8
        }}
      >
        {Array.from({ length: COLS * ROWS }).map((_, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);

          const slot = slots.find(
            s => s.slot_x === col && s.slot_y === row
          );

          return (
            <div
              key={i}
              onClick={() =>
                slot ? setEditing(slot) : addSlot(col, row)
              }
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                borderRadius: 14,
                border: "2px solid #2aff2a",
                background: slot ? "#0c1f0c" : "#111",
                color: "#7CFC00",
                padding: 8,
                cursor: "pointer",
                position: "relative"
              }}
            >
              {slot && (
                <>
                  <div style={{ fontWeight: 600 }}>
                    {slot.label || "HQ"}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {slot.player_x && slot.player_y
                      ? `${slot.player_x},${slot.player_y}`
                      : "(no coords)"}
                  </div>

                  {canEdit && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        deleteSlot(slot.id);
                      }}
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        background: "#300",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer"
                      }}
                    >
                      ×
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {editing && (
        <div style={{ marginTop: 24 }}>
          <h3>Edit Slot</h3>
          <input
            placeholder="HQ Name"
            value={editing.label || ""}
            onChange={e =>
              setEditing({ ...editing, label: e.target.value })
            }
          />
          <input
            placeholder="Player X"
            value={editing.player_x || ""}
            onChange={e =>
              setEditing({ ...editing, player_x: e.target.value })
            }
          />
          <input
            placeholder="Player Y"
            value={editing.player_y || ""}
            onChange={e =>
              setEditing({ ...editing, player_y: e.target.value })
            }
          />
          <button onClick={saveSlot}>Save</button>
          <button onClick={() => setEditing(null)}>Cancel</button>
        </div>
      )}
    </div>
  );
}
