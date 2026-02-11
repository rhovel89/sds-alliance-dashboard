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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!alliance_id) return;

    supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", alliance_id.toUpperCase())
      .then(({ data }) => {
        setSlots(data || []);
        setLoading(false);
      });
  }, [alliance_id]);

  if (loading) {
    return <div style={{ padding: 24 }}>Loading HQ Map…</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>🧟 HQ MAP LOADED FOR ALLIANCE: {alliance_id?.toUpperCase()}</h1>

      {slots.length === 0 && (
        <p style={{ opacity: 0.6 }}>No HQ slots found.</p>
      )}

      <div
        style={{
          position: "relative",
          width: 800,
          height: 600,
          border: "2px solid #555",
          background: "#111",
        }}
      >
        {slots.map((s) => (
          <div
            key={s.id}
            style={{
              position: "absolute",
              left: s.slot_x,
              top: s.slot_y,
              padding: "6px 8px",
              background: "#222",
              border: "1px solid #0f0",
              color: "#0f0",
              fontSize: 12,
            }}
          >
            {s.label ?? "Empty"}
          </div>
        ))}
      </div>
    </div>
  );
}
