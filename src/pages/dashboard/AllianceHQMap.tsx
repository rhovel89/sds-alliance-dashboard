import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type HQSlot = {
  id: string;
  alliance_id: string;
  slot_x: number;
  slot_y: number;
  label: string | null;
};

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const [slots, setSlots] = useState<HQSlot[]>([]);

  useEffect(() => {
    if (!alliance_id) return;

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
      <h1>🧟 HQ MAP LOADED FOR ALLIANCE: {alliance_id?.toUpperCase()}</h1>

      <div
        style={{
          position: "relative",
          width: 1024,
          height: 1024,
          border: "2px solid #00ff00",
          marginTop: 20,
        }}
      >
        {slots.map(slot => (
          <div
            key={slot.id}
            style={{
              position: "absolute",
              left: slot.slot_x,
              top: slot.slot_y,
              background: "#3cff00",
              color: "#000",
              padding: "6px 10px",
              borderRadius: 6,
              fontWeight: 700,
            }}
          >
            {slot.label || "Empty"}
            <br />
            X:{slot.slot_x} Y:{slot.slot_y}
          </div>
        ))}

        {slots.length === 0 && (
          <div style={{ color: "#999" }}>No HQ slots found.</div>
        )}
      </div>
    </div>
  );
}
