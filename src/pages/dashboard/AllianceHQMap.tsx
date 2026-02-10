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
  const alliance = alliance_id?.toUpperCase();

  useEffect(() => {
    if (!alliance) return;

    supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", alliance)
      .then(({ data }) => setSlots(data || []));
  }, [alliance]);

  return (
    <div style={{ padding: 24 }}>
      <h2>🧟 HQ MAP LOADED FOR ALLIANCE: {alliance}</h2>

      {slots.length === 0 && <p>No HQ slots found.</p>}

      <div style={{
        position: "relative",
        width: 1024,
        height: 1024,
        border: "1px solid #39ff14",
        marginTop: 16
      }}>
        {slots.map(slot => (
          <div
            key={slot.id}
            style={{
              position: "absolute",
              left: slot.slot_x,
              top: slot.slot_y,
              background: "#39ff14",
              color: "#000",
              padding: "6px 8px",
              borderRadius: 6,
              fontSize: 12
            }}
          >
            <strong>{slot.label || "Empty"}</strong><br />
            X:{slot.slot_x} Y:{slot.slot_y}
          </div>
        ))}
      </div>
    </div>
  );
}
