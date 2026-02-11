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

  const moveSlot = async (id: string, x: number, y: number) => {
    if (!canEdit) return;

    await supabase
      .from("alliance_hq_map")
      .update({ slot_x: x, slot_y: y })
      .eq("id", id);

    setSlots(prev =>
      prev.map(s => (s.id === id ? { ...s, slot_x: x, slot_y: y } : s))
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>🧟 HQ MAP LOADED FOR ALLIANCE: {upperAlliance}</h1>

      {slots.length === 0 && (
        <p style={{ opacity: 0.6 }}>No HQ slots found</p>
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
            draggable={canEdit}
            onDragEnd={e => {
              const rect = (e.target as HTMLElement).parentElement!.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              moveSlot(slot.id, x, y);
            }}
            style={{
              position: "absolute",
              left: slot.slot_x,
              top: slot.slot_y,
              padding: 6,
              background: "#222",
              border: "1px solid lime",
              color: "lime",
              fontSize: 12,
              cursor: canEdit ? "grab" : "default"
            }}
          >
            {slot.label || "HQ"}
          </div>
        ))}
      </div>
    </div>
  );
}
