import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = alliance_id?.toUpperCase() || "";
  const [slots, setSlots] = useState<any[]>([]);
  const { canEdit } = useHQPermissions(upperAlliance);

  // Load slots
  useEffect(() => {
    if (!upperAlliance) return;

    supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", upperAlliance)
      .then(({ data }) => setSlots(data || []));
  }, [upperAlliance]);

  // Add slot
  async function addSlot() {
    const { data } = await supabase
      .from("alliance_hq_map")
      .insert([
        {
          alliance_id: upperAlliance,
          slot_x: 100,
          slot_y: 100,
          label: "New HQ"
        }
      ])
      .select();

    if (data) {
      setSlots(prev => [...prev, ...data]);
    }
  }

  // Update label
  async function updateLabel(id: string, newLabel: string) {
    await supabase
      .from("alliance_hq_map")
      .update({ label: newLabel })
      .eq("id", id);

    setSlots(prev =>
      prev.map(s => (s.id === id ? { ...s, label: newLabel } : s))
    );
  }

  // ✅ FIXED DELETE
  async function deleteSlot(id: string) {
    const { error } = await supabase
      .from("alliance_hq_map")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete failed:", error);
      return;
    }

    // Remove locally
    setSlots(prev => prev.filter(s => s.id !== id));
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>🧟 HQ MAP LOADED FOR ALLIANCE: {upperAlliance}</h1>

      {canEdit && (
        <button
          onClick={addSlot}
          style={{
            marginBottom: 16,
            padding: "6px 12px",
            background: "lime",
            color: "black",
            border: "none"
          }}
        >
          + Add HQ Slot
        </button>
      )}

      <div
        style={{
          position: "relative",
          width: 800,
          height: 800,
          border: "1px solid #444"
        }}
      >
        {slots.map(slot => (
          <div
            key={slot.id}
            style={{
              position: "absolute",
              left: slot.slot_x,
              top: slot.slot_y,
              padding: 8,
              background: "#111",
              border: "1px solid lime",
              color: "lime",
              fontSize: 12
            }}
          >
            {canEdit ? (
              <>
                <input
                  value={slot.label || ""}
                  onChange={e =>
                    updateLabel(slot.id, e.target.value)
                  }
                  style={{
                    background: "black",
                    color: "lime",
                    border: "1px solid lime",
                    marginBottom: 4
                  }}
                />
                <br />
                <button
                  onClick={() => deleteSlot(slot.id)}
                  style={{
                    background: "red",
                    color: "white",
                    border: "none",
                    padding: "2px 6px",
                    fontSize: 10
                  }}
                >
                  Delete
                </button>
              </>
            ) : (
              slot.label || "HQ"
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
