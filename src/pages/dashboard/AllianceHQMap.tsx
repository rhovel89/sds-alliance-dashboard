import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type HQSlot = {
  id: string;
  slot_x: number;
  slot_y: number;
  label: string | null;
};

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const [slots, setSlots] = useState<HQSlot[]>([]);
  const [role, setRole] = useState<string>("member");

  const canEdit = role === "owner" || role === "r4" || role === "r5";

  useEffect(() => {
    if (!alliance_id) return;

    supabase
      .from("alliance_members")
      .select("role")
      .eq("alliance_id", alliance_id.toUpperCase())
      .single()
      .then(({ data }) => {
        if (data?.role) setRole(data.role.toLowerCase());
      });

    supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", alliance_id.toUpperCase())
      .then(({ data }) => {
        setSlots(data || []);
      });
  }, [alliance_id]);

  return (
    <div style={{ padding: 24 }}>
      <h2>🧟 HQ MAP LOADED FOR ALLIANCE: {alliance_id}</h2>

      {!canEdit && (
        <p style={{ opacity: 0.6 }}>
          View only — R4 / R5 / Owner required to edit
        </p>
      )}

      <div
        style={{
          position: "relative",
          width: 600,
          height: 600,
          border: "2px solid #ff4444",
          marginTop: 16
        }}
      >
        {slots.map(slot => (
          <div
            key={slot.id}
            style={{
              position: "absolute",
              left: slot.slot_x,
              top: slot.slot_y,
              padding: "6px 10px",
              background: canEdit ? "#ff4444" : "#888",
              color: "#fff",
              borderRadius: 4,
              cursor: canEdit ? "move" : "default"
            }}
          >
            {slot.label ?? "Empty"}
          </div>
        ))}
      </div>
    </div>
  );
}
