import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";

const COLS = 18;
const ROWS = 20;
const TOTAL = COLS * ROWS;

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = alliance_id?.toUpperCase() || "";
  const { canEdit } = useHQPermissions(upperAlliance);

  const [slots, setSlots] = useState<any[]>([]);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
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

  const getSlot = (num: number) =>
    slots.find(s => s.slot_number === num);

  const openEditor = (num: number) => {
    const slot = getSlot(num);
    setEditingSlot(num);
    setNameInput(slot?.label || "");
    setCoordsInput(slot?.coords || "");
  };

  const saveSlot = async () => {
    if (!canEdit || editingSlot === null) return;

    const existing = getSlot(editingSlot);

    if (existing) {
      await supabase
        .from("alliance_hq_map")
        .update({ label: nameInput, coords: coordsInput })
        .eq("id", existing.id);
    } else {
      await supabase.from("alliance_hq_map").insert({
        alliance_id: upperAlliance,
        slot_number: editingSlot,
        label: nameInput,
        coords: coordsInput
      });
    }

    const { data } = await supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", upperAlliance);

    setSlots(data || []);
    setEditingSlot(null);
  };

  const deleteSlot = async () => {
    if (!canEdit || editingSlot === null) return;

    const existing = getSlot(editingSlot);
    if (!existing) return;

    await supabase
      .from("alliance_hq_map")
      .delete()
      .eq("id", existing.id);

    setSlots(prev =>
      prev.filter(s => s.id !== existing.id)
    );

    setEditingSlot(null);
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>HQ Map</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gap: 10
        }}
      >
        {Array.from({ length: TOTAL }).map((_, i) => {
          const num = i + 1;
          const slot = getSlot(num);

          return (
            <div
              key={num}
              onClick={() => canEdit && openEditor(num)}
              style={{
                border: "1px solid #2f2f2f",
                borderRadius: 8,
                padding: 10,
                minHeight: 60,
                background: "#111",
                color: "#9eff9e",
                cursor: canEdit ? "pointer" : "default",
                fontSize: 12
              }}
            >
              <strong>#{num}</strong>
              <div>{slot?.label || "(empty)"}</div>
              <div style={{ opacity: 0.6 }}>
                {slot?.coords || "(no coords)"}
              </div>
            </div>
          );
        })}
      </div>

      {editingSlot !== null && (
        <div style={{ marginTop: 30 }}>
          <h3>Edit Slot #{editingSlot}</h3>

          <input
            placeholder="Name"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            style={{ marginRight: 10 }}
          />

          <input
            placeholder="Coords (12,34)"
            value={coordsInput}
            onChange={e => setCoordsInput(e.target.value)}
          />

          <div style={{ marginTop: 10 }}>
            <button onClick={saveSlot}>Save</button>
            <button onClick={deleteSlot} style={{ marginLeft: 10 }}>
              Delete
            </button>
            <button
              onClick={() => setEditingSlot(null)}
              style={{ marginLeft: 10 }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
