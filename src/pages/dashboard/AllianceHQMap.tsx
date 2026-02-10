import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type Slot = {
  id: string;
  alliance_id: string;
  slot_x: number;
  slot_y: number;
  label: string | null;
};

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const [slots, setSlots] = useState<Slot[]>([]);

  useEffect(() => {
    if (!alliance_id) return;

    supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", alliance_id.toUpperCase())
      .then(({ data, error }) => {
        if (error) {
          console.error("HQ MAP ERROR:", error);
        } else {
          setSlots(data || []);
        }
      });
  }, [alliance_id]);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ color: "#9cff9c" }}>
        🧟 HQ MAP LOADED FOR ALLIANCE: {alliance_id?.toUpperCase()}
      </h1>

      {slots.length === 0 && (
        <p style={{ opacity: 0.7 }}>No HQ slots found.</p>
      )}

      <div
        style={{
          position: "relative",
          width: 1024,
          height: 1024,
          border: "1px solid #3cff3c",
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
              background: "#3cff3c",
              color: "#000",
              padding: "6px 10px",
              borderRadius: 6,
              fontSize: 12
            }}
          >
            <strong>{slot.label || "Empty"}</strong>
            <div>X:{slot.slot_x} Y:{slot.slot_y}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
