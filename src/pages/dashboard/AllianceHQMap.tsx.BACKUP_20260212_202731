import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";

const COLS = 16;
const ROWS = 17;
const CELL_SIZE = 95;

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = alliance_id?.toUpperCase() || "";
  const { canEdit } = useHQPermissions(upperAlliance);

  const [slots, setSlots] = useState<any[]>([]);
  const [editingSlot, setEditingSlot] = useState<any | null>(null);
  const [formName, setFormName] = useState("");
  const [formCoords, setFormCoords] = useState("");

  useEffect(() => {
    if (!upperAlliance) return;

    supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", upperAlliance)
      .then(({ data }) => setSlots(data || []));
  }, [upperAlliance]);

  const saveSlot = async () => {
    if (!editingSlot) return;

    const coords = formCoords.split(",");
    const player_x = coords[0] ? parseInt(coords[0]) : null;
    const player_y = coords[1] ? parseInt(coords[1]) : null;

    await supabase
      .from("alliance_hq_map")
      .update({
        label: formName,
        player_x,
        player_y
      })
      .eq("id", editingSlot.id);

    setSlots(prev =>
      prev.map(s =>
        s.id === editingSlot.id
          ? { ...s, label: formName, player_x, player_y }
          : s
      )
    );

    setEditingSlot(null);
  };

  const deleteSlot = async (id: string) => {
    await supabase
      .from("alliance_hq_map")
      .delete()
      .eq("id", id);

    setSlots(prev => prev.filter(s => s.id !== id));
  };

  const addSlot = async (slot_number: number) => {
    const { data } = await supabase
      .from("alliance_hq_map")
      .insert({
        alliance_id: upperAlliance,
        slot_number,
        label: "New HQ"
      })
      .select()
      .single();

    if (data) setSlots(prev => [...prev, data]);
  };

  const renderCell = (index: number) => {
    const existing = slots.find(s => s.slot_number === index);

    return (
      <div
        key={index}
        style={{
          width: CELL_SIZE,
          height: CELL_SIZE,
          border: "1px solid #2f2f2f",
          borderRadius: 12,
          background: "#0e0e0e",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          fontSize: 13,
          color: "#9eff9e",
          cursor: canEdit ? "pointer" : "default",
          transition: "0.2s ease"
        }}
        onClick={() => {
          if (!canEdit) return;
          if (existing) {
            setEditingSlot(existing);
            setFormName(existing.label || "");
            setFormCoords(
              existing.player_x && existing.player_y
                ? `${existing.player_x},${existing.player_y}`
                : ""
            );
          } else {
            addSlot(index);
          }
        }}
      >
        {existing ? (
          <>
            <strong>{existing.label}</strong>
            <small>
              {existing.player_x && existing.player_y
                ? `(${existing.player_x}, ${existing.player_y})`
                : "(no coords)"}
            </small>
            {canEdit && (
              <button
                style={{
                  marginTop: 6,
                  background: "#3a0000",
                  color: "#ffb3b3",
                  border: "1px solid #660000",
                  borderRadius: 6,
                  padding: "2px 6px",
                  fontSize: 11,
                  cursor: "pointer"
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSlot(existing.id);
                }}
              >
                Delete
              </button>
            )}
          </>
        ) : (
          <span style={{ opacity: 0.3 }}>Empty</span>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: 30 }}>
      <h1 style={{ color: "#9eff9e" }}>
        HQ Map — {upperAlliance}
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
          gap: 14,
          marginTop: 30
        }}
      >
        {Array.from({ length: COLS * ROWS }).map((_, i) =>
          renderCell(i + 1)
        )}
      </div>

      {editingSlot && (
        <div
          style={{
            marginTop: 40,
            padding: 20,
            border: "1px solid #1f1f1f",
            borderRadius: 12,
            background: "#0b0b0b"
          }}
        >
          <h3 style={{ color: "#9eff9e" }}>
            Edit Cell #{editingSlot.slot_number}
          </h3>

          <input
            placeholder="Name"
            value={formName}
            onChange={e => setFormName(e.target.value)}
            style={{
              width: "100%",
              marginBottom: 10,
              padding: 8,
              background: "#111",
              border: "1px solid #333",
              color: "#9eff9e"
            }}
          />

          <input
            placeholder="Coords (e.g. 222,333)"
            value={formCoords}
            onChange={e => setFormCoords(e.target.value)}
            style={{
              width: "100%",
              marginBottom: 10,
              padding: 8,
              background: "#111",
              border: "1px solid #333",
              color: "#9eff9e"
            }}
          />

          <button
            onClick={saveSlot}
            style={{
              marginRight: 10,
              padding: "6px 12px",
              background: "#003300",
              color: "#9eff9e",
              border: "1px solid #006600",
              borderRadius: 6
            }}
          >
            Save
          </button>

          <button
            onClick={() => setEditingSlot(null)}
            style={{
              padding: "6px 12px",
              background: "#222",
              color: "#ccc",
              border: "1px solid #444",
              borderRadius: 6
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}


