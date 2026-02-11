import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!alliance_id) return;

    supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", alliance_id.toUpperCase())
      .then(({ data, error }) => {
        if (error) {
          console.error("HQ MAP LOAD ERROR:", error);
        }
        setSlots(data || []);
        setLoading(false);
      });
  }, [alliance_id]);

  if (loading) {
    return <div style={{ padding: 24 }}>Loading HQ Map…</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>HQ MAP LOADED FOR ALLIANCE: {alliance_id?.toUpperCase()}</h1>

      {slots.length === 0 && (
        <p style={{ opacity: 0.7 }}>No HQ slots found</p>
      )}

      <div
        style={{
          position: "relative",
          width: 600,
          height: 600,
          border: "2px solid #ff4444",
          background: "#0b0b0b",
          marginTop: 16,
        }}
      >
        {slots.map(slot => (
          <div
            key={slot.id}
            style={{
              position: "absolute",
              left: slot.slot_x,
              top: slot.slot_y,
              width: 80,
              height: 40,
              background: "#2b0000",
              border: "1px solid red",
              color: "#fff",
              fontSize: 12,
              padding: 4,
            }}
          >
            {slot.label || "HQ"}
          </div>
        ))}
      </div>
    </div>
  );
}
