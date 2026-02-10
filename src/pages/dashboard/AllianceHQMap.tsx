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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!alliance_id) return;

    supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", alliance_id)
      .then(({ data, error }) => {
        console.log("HQ MAP DATA:", data, error);
        setSlots(data || []);
        setLoading(false);
      });
  }, [alliance_id]);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ color: "#00ff66" }}>
        🧟 HQ MAP LOADED FOR ALLIANCE: {alliance_id?.toUpperCase()}
      </h1>

      {loading && <p>Loading HQ map…</p>}

      {!loading && slots.length === 0 && (
        <p style={{ opacity: 0.6 }}>No HQ slots found.</p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(10, 80px)",
          gap: 8,
          marginTop: 24,
        }}
      >
        {slots.map((s) => (
          <div
            key={s.id}
            style={{
              border: "1px solid #00ff66",
              padding: 8,
              textAlign: "center",
            }}
          >
            <strong>{s.label || "Empty"}</strong>
            <div>X:{s.slot_x} Y:{s.slot_y}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
