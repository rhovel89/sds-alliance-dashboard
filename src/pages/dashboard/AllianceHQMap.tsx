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
  const normalizedAllianceId = alliance_id?.toUpperCase();

  const [slots, setSlots] = useState<HQSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!normalizedAllianceId) return;

    console.log("HQ MAP QUERY ALLIANCE:", normalizedAllianceId);

    supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", normalizedAllianceId)
      .then(({ data, error }) => {
        if (error) {
          console.error("HQ MAP ERROR:", error);
        }
        setSlots(data ?? []);
        setLoading(false);
      });
  }, [normalizedAllianceId]);

  return (
    <div style={{ padding: 24 }}>
      <h1>🧟 HQ MAP LOADED FOR ALLIANCE: {normalizedAllianceId}</h1>

      {loading && <p>Loading HQ slots…</p>}

      {!loading && slots.length === 0 && (
        <p>No HQ slots found.</p>
      )}

      <div style={{ position: "relative", width: 1024, height: 1024, border: "1px solid #0f0" }}>
        {slots.map(slot => (
          <div
            key={slot.id}
            style={{
              position: "absolute",
              left: slot.slot_x,
              top: slot.slot_y,
              padding: "6px 10px",
              background: "#0f0",
              color: "#000",
              borderRadius: 4,
              fontSize: 12,
            }}
          >
            <strong>{slot.label ?? "Empty"}</strong>
            <div>X:{slot.slot_x} Y:{slot.slot_y}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// deploy tick 2026-02-10 08:44:56Z
