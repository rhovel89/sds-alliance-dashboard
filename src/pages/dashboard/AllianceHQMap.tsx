import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const [slots, setSlots] = useState<any[]>([]);
  const { canEdit } = useHQPermissions(alliance_id);

  useEffect(() => {
    if (!alliance_id) return;

    supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", alliance_id.toUpperCase())
      .then(({ data }) => setSlots(data || []));
  }, [alliance_id]);

  const updateLabel = async (id: string, newLabel: string) => {
    await supabase
      .from("alliance_hq_map")
      .update({ label: newLabel })
      .eq("id", id);

    setSlots(prev =>
      prev.map(slot =>
        slot.id === id ? { ...slot, label: newLabel } : slot
      )
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>🧟 HQ MAP LOADED FOR ALLIANCE: {alliance_id?.toUpperCase()}</h1>

      {slots.length === 0 && (
        <p style={{ opacity: 0.6 }}>No HQ slots found</p>
      )}

      <div style={{ position: "relative", width: 800, height: 800, border: "1px solid #444" }}>
        {slots.map(slot => (
          <div
            key={slot.id}
            style={{
              position: "absolute",
              left: slot.slot_x,
              top: slot.slot_y,
              padding: 6,
              background: "#222",
              border: "1px solid lime",
              color: "lime",
              fontSize: 12
            }}
          >
            {canEdit ? (
              <input
                defaultValue={slot.label || ""}
                onBlur={(e) => updateLabel(slot.id, e.target.value)}
                style={{
                  background: "black",
                  color: "lime",
                  border: "1px solid lime",
                  fontSize: 12
                }}
              />
            ) : (
              slot.label || "HQ"
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
