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
  const normalizedAllianceId = alliance_id?.toUpperCase();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!normalizedAllianceId) return;

    supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", normalizedAllianceId)
      .then(({ data }) => {
        setSlots(data || []);
        setLoading(false);
      });
  }, [normalizedAllianceId]);

  if (loading) {
    return <div style={{ padding: 24 }}>Loading HQ Map…</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>🧟 HQ MAP LOADED FOR ALLIANCE: {normalizedAllianceId}</h1>

      {slots.length === 0 && <p>No HQ slots found.</p>}

      <div
        style={{
          position: "relative",
          width: 600,
          height: 600,
          border: "2px solid #2aff2a",
          marginTop: 24,
        }}
      >
        {slots.map(slot => (
          <div
            key={slot.id}
            style={{
              position: "absolute",
              left: slot.slot_x,
              top: slot.slot_y,
              background: "#2aff2a",
              color: "#000",
              padding: "6px 8px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {slot.label ?? "Empty"}
            <br />
            X:{slot.slot_x} Y:{slot.slot_y}
          </div>
        ))}
      </div>
    </div>
  );
}
