import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = alliance_id?.toUpperCase() || "";
  const { canEdit } = useHQPermissions(upperAlliance);

  const [slots, setSlots] = useState<any[]>([]);

  useEffect(() => {
    if (!upperAlliance) return;

    supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", upperAlliance)
      .then(({ data }) => setSlots(data || []));
  }, [upperAlliance]);

  // ✅ ADD SLOT (REAL DATABASE INSERT)
  const addSlot = async () => {
    if (!canEdit) return;

    const nextCellNumber = slots.length + 1;

    const { data, error } = await supabase
      .from("alliance_hq_map")
      .insert([
        {
          alliance_id: upperAlliance,
          label: "New HQ",
          slot_x: 100,
          slot_y: 100,
          cell_number: nextCellNumber
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Add slot error:", error);
      return;
    }

    setSlots(prev => [...prev, data]);
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>🧟 HQ MAP LOADED FOR ALLIANCE: {upperAlliance}</h1>

      {canEdit && (
        <button
          onClick={addSlot}
          style={{
            marginBottom: 12,
            padding: "6px 12px",
            background: "lime",
            border: "none",
            cursor: "pointer"
          }}
        >
          ➕ Add HQ Slot
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
              padding: 4,
              background: "#111",
              border: "1px solid lime",
              color: "lime",
              fontSize: 10
            }}
          >
            {slot.label}
          </div>
        ))}
      </div>
    </div>
  );
}
