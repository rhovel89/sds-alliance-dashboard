import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";

const COLS = 16;
const ROWS = 17;
const CELL_SIZE = 90;

export default function AllianceHQMap() {
  const { alliance_id } = useParams();
  const upperAlliance = alliance_id?.toUpperCase() || "";
  const { canEdit } = useHQPermissions(upperAlliance);

  const [slots, setSlots] = useState([]);
  const [editingSlot, setEditingSlot] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [coordsInput, setCoordsInput] = useState("");

  useEffect(() => {
    if (!upperAlliance) return;

    supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", upperAlliance)
      .then(({ data }) => setSlots(data || []));
  }, [upperAlliance]);

  const openEdit = (slot) => {
    setEditingSlot(slot);
    setNameInput(slot?.label || "");
    setCoordsInput(
      slot?.player_x != null && slot?.player_y != null
        ? `${slot.player_x},${slot.player_y}`
        : ""
    );
  };

  const saveSlot = async () => {
    if (!editingSlot) return;

    let player_x = null;
    let player_y = null;

    if (coordsInput.includes(",")) {
      const parts = coordsInput.split(",");
      player_x = parseInt(parts[0]);
      player_y = parseInt(parts[1]);
    }

    await supabase
      .from("alliance_hq_map")
      .update({
        label: nameInput,
        player_x,
        player_y
      })
      .eq("id", editingSlot.id);

    const { data } = await supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", upperAlliance);

    setSlots(data || []);
    setEditingSlot(null);
  };

  const deleteSlot = async (id) => {
    await supabase
      .from("alliance_hq_map")
      .delete()
      .eq("id", id);

    setSlots(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ color: "#9eff9e" }}>HQ Map</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
          gap: 12,
          justifyContent: "center"
        }}
      >
        {Array.from({ length: ROWS }).map((_, y) =>
          Array.from({ length: COLS }).map((_, x) => {
            const slot = slots.find(
              s => s.slot_x === x && s.slot_y === y
            );

            return (
              <div
                key={x + "-" + y}
                onClick={() => slot && openEdit(slot)}
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  background: slot ? "#111" : "#0a0a0a",
                  border: "2px solid #2cff2c",
                  borderRadius: 12,
                  padding: 6,
                  fontSize: 12,
                  color: "#9eff9e",
                  cursor: slot ? "pointer" : "default",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  alignItems: "center",
                  textAlign: "center"
                }}
              >
                {slot ? (
                  <>
                    <div style={{ fontWeight: "bold" }}>
                      {slot.label || "New HQ"}
                    </div>

                    {slot.player_x != null && (
                      <div>
                        ({slot.player_x},{slot.player_y})
                      </div>
                    )}

                    {canEdit && (
                      <button
                        style={{
                          marginTop: 4,
                          background: "#300",
                          color: "white",
                          border: "none",
                          padding: "4px 6px",
                          borderRadius: 6,
                          cursor: "pointer"
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSlot(slot.id);
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </>
                ) : (
                  <div style={{ opacity: 0.3 }}>
                    {x},{y}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {editingSlot && (
        <div style={{ marginTop: 40 }}>
          <h2>Edit Slot</h2>

          <input
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            placeholder="HQ Name"
            style={{ marginRight: 12 }}
          />

          <input
            value={coordsInput}
            onChange={e => setCoordsInput(e.target.value)}
            placeholder="e.g. 123,456"
          />

          <button onClick={saveSlot} style={{ marginLeft: 12 }}>
            Save
          </button>

          <button onClick={() => setEditingSlot(null)} style={{ marginLeft: 8 }}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}
