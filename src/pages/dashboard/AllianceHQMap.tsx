import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = alliance_id?.toUpperCase() || "";
  const { canEdit } = useHQPermissions(upperAlliance);

  const [slots, setSlots] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [coords, setCoords] = useState("");

  useEffect(() => {
    if (!upperAlliance) return;

    supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", upperAlliance)
      .then(({ data }) => setSlots(data || []));
  }, [upperAlliance]);

  const openEditor = (slot: any) => {
    if (!canEdit) return;
    setEditing(slot);
    setName(slot.label || "");
    setCoords(slot.coords || "");
  };

  const saveSlot = async () => {
    if (!editing) return;

    await supabase
      .from("alliance_hq_map")
      .update({ label: name, coords })
      .eq("id", editing.id);

    setSlots(prev =>
      prev.map(s =>
        s.id === editing.id ? { ...s, label: name, coords } : s
      )
    );

    setEditing(null);
  };

  const deleteSlot = async () => {
    if (!editing) return;

    await supabase
      .from("alliance_hq_map")
      .delete()
      .eq("id", editing.id);

    setSlots(prev => prev.filter(s => s.id !== editing.id));
    setEditing(null);
  };

  const getCell = (index: number) => {
    return slots.find(s => s.slot_number === index);
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 20 }}>
        HQ Map — {upperAlliance}
      </h1>

      {/* GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 16,
          maxWidth: 1100
        }}
      >
        {Array.from({ length: 36 }).map((_, i) => {
          const slot = getCell(i + 1);

          return (
            <div
              key={i}
              onClick={() => slot && openEditor(slot)}
              style={{
                border: "1px solid #2a2a2a",
                borderRadius: 12,
                padding: 14,
                background: "#111",
                minHeight: 90,
                cursor: canEdit ? "pointer" : "default"
              }}
            >
              <div style={{ fontWeight: 600 }}>
                #{i + 1}
              </div>

              {slot ? (
                <>
                  <div style={{ marginTop: 6 }}>
                    {slot.label || "Unnamed"}
                  </div>
                  <div style={{ opacity: 0.6, fontSize: 12 }}>
                    {slot.coords || "(no coords)"}
                  </div>
                </>
              ) : (
                <div style={{ opacity: 0.4, marginTop: 8 }}>
                  (empty)
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* EDIT PANEL */}
      {editing && (
        <div
          style={{
            marginTop: 30,
            padding: 20,
            borderRadius: 12,
            background: "#151515",
            maxWidth: 1100
          }}
        >
          <h3>Edit Cell #{editing.slot_number}</h3>

          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="HQ Name"
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 8,
                border: "1px solid #333",
                background: "#1a1a1a"
              }}
            />

            <input
              value={coords}
              onChange={e => setCoords(e.target.value)}
              placeholder="e.g. (12,34)"
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 8,
                border: "1px solid #333",
                background: "#1a1a1a"
              }}
            />
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
            <button onClick={saveSlot}>Save</button>
            <button onClick={deleteSlot}>Delete</button>
            <button onClick={() => setEditing(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
