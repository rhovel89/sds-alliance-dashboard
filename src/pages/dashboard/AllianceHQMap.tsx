import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = alliance_id?.toUpperCase() || "";
  const { canEdit } = useHQPermissions(upperAlliance);

  const [slots, setSlots] = useState<any[]>([]);

  useEffect(() => {
    if (!upperAlliance) return;

    supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", upperAlliance)
      .then(({ data }) => setSlots(data || []));
  }, [upperAlliance]);

  return (
    <div style={{ padding: 24 }}>
      <h1>🧟 HQ MAP LOADED FOR ALLIANCE: {upperAlliance}</h1>

      <div
        style={{
          position: "relative",
          width: 1000,
          height: 1000,
          border: "1px solid #444"
        }}
      >
        {slots.map(slot => (
          <div
            key={slot.id}
            style={{
              position: "absolute",
              left: slot.slot_x,
              top: slot.slot_y,
              background: "#222",
              border: "1px solid lime",
              color: "lime",
              fontSize: 12,

              /* SAFE AUTO EXPAND */
              minWidth: 60,
              minHeight: 60,
              padding: 8,
              textAlign: "center",
              whiteSpace: "normal",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {slot.label || "HQ"}
          </div>
        ))}
      </div>
    </div>
  );
}
