import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const [slots, setSlots] = useState<any[]>([]);

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

      {slots.length === 0 && <p>No HQ slots found.</p>}

      <div
        style={{
          position: "relative",
          width: 1024,
          height: 1024,
          border: "2px solid #39ff14",
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
              background: "#39ff14",
              color: "#000",
              padding: "6px 10px",
              borderRadius: 6,
              fontWeight: "bold",
              transform: "translate(-50%, -50%)",
            }}
          >
            {slot.label || "Empty"}
            <br />
            X:{slot.slot_x} Y:{slot.slot_y}
          </div>
        ))}
      </div>
    </div>
  );
}
