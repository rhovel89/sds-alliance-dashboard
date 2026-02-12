import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";

const COLS = 16;
const ROWS = 17;
const CELL_SIZE = 70;

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = alliance_id?.toUpperCase() || "";
  const { canEdit } = useHQPermissions(upperAlliance);

  const [slots, setSlots] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!upperAlliance) return;
    loadSlots();
  }, [upperAlliance]);

  const loadSlots = async () => {
    const { data } = await supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", upperAlliance);

    setSlots(data || []);
  };

  const saveSlot = async (slot: any) => {
    await supabase
      .from("alliance_hq_map")
      .update({
        label: slot.label,
        player_x: slot.player_x,
        player_y: slot.player_y,
      })
      .eq("id", slot.id);

    setEditingId(null);
    loadSlots();
  };

  const deleteSlot = async (id: string) => {
    if (!canEdit) return;

    await supabase
      .from("alliance_hq_map")
      .delete()
      .eq("id", id);

    loadSlots();
  };

  const addSlot = async () => {
    if (!canEdit) return;

    await supabase.from("alliance_hq_map").insert({
      alliance_id: upperAlliance,
      slot_x: 0,
      slot_y: 0,
      label: "New HQ",
      player_x: null,
      player_y: null,
    });

    loadSlots();
  };

  const moveSlot = async (id: string, x: number, y: number) => {
    if (!canEdit) return;

    await supabase
      .from("alliance_hq_map")
      .update({ slot_x: x, slot_y: y })
      .eq("id", id);

    loadSlots();
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>🧟 HQ MAP LOADED FOR ALLIANCE: {upperAlliance}</h1>

      {canEdit && (
        <button onClick={addSlot} style={{ marginBottom: 12 }}>
          ➕ Add HQ Slot
        </button>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${ROWS}, ${CELL_SIZE}px)`,
          gap: 4,
        }}
      >
        {slots.map((slot) => (
          <div
            key={slot.id}
            draggable={canEdit}
            onDragEnd={(e) => {
              const grid = e.currentTarget.parentElement!.getBoundingClientRect();
              const x = e.clientX - grid.left;
              const y = e.clientY - grid.top;
              moveSlot(slot.id, x, y);
            }}
            style={{
              border: "1px solid lime",
              background: "#222",
              color: "lime",
              fontSize: 12,
              padding: 6,
              cursor: canEdit ? "grab" : "default",
              textAlign: "center",
              whiteSpace: "normal",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {editingId === slot.id ? (
              <>
                <input
                  value={slot.label || ""}
                  onChange={(e) =>
                    setSlots((prev) =>
                      prev.map((s) =>
                        s.id === slot.id
                          ? { ...s, label: e.target.value }
                          : s
                      )
                    )
                  }
                />
                <input
                  placeholder="Player X"
                  value={slot.player_x || ""}
                  onChange={(e) =>
                    setSlots((prev) =>
                      prev.map((s) =>
                        s.id === slot.id
                          ? { ...s, player_x: e.target.value }
                          : s
                      )
                    )
                  }
                />
                <input
                  placeholder="Player Y"
                  value={slot.player_y || ""}
                  onChange={(e) =>
                    setSlots((prev) =>
                      prev.map((s) =>
                        s.id === slot.id
                          ? { ...s, player_y: e.target.value }
                          : s
                      )
                    )
                  }
                />
                <button onClick={() => saveSlot(slot)}>💾 Save</button>
              </>
            ) : (
              <>
                <div>{slot.label}</div>
                {slot.player_x && (
                  <div>
                    ({slot.player_x}, {slot.player_y})
                  </div>
                )}
                {canEdit && (
                  <>
                    <button onClick={() => setEditingId(slot.id)}>✏ Edit</button>
                    <button onClick={() => deleteSlot(slot.id)}>🗑 Delete</button>
                  </>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


