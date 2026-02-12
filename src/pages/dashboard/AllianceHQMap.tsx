import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";

const COLS = 16;
const ROWS = 17;
const CELL_SIZE = 96; // Bigger cells

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
      <h1>🧟 HQ Map</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
          gap: 10,
          justifyContent: "start"
        }}
      >
        {Array.from({ length: COLS * ROWS }).map((_, index) => {
          const x = index % COLS;
          const y = Math.floor(index / COLS);

          const slot = slots.find(
            s => s.slot_x === x && s.slot_y === y
          );

          return (
            <div
              key={index}
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                borderRadius: 14,
                border: "1px solid #333",
                background: slot ? "#0f1f0f" : "#111",
                color: slot ? "lime" : "#666",
                padding: 8,
                fontSize: 13,
                position: "relative"
              }}
            >
              <div style={{ fontWeight: 600 }}>
                {slot?.label || ""}
              </div>

              <div style={{ fontSize: 11, opacity: 0.7 }}>
                {slot ? `${x},${y}` : ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
