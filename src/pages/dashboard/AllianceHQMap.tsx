import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import "./hq-map.css";

type Slot = {
  id: string;
  label: string | null;
  slot_x: number;
  slot_y: number;
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
      .then(({ data }) => setSlots(data || []));
  }, [alliance_id]);

  return (
    <div className="hq-map-wrapper">
      <h1 className="hq-title">
        🧟 HQ MAP — {alliance_id?.toUpperCase()}
      </h1>

      <div className="hq-map">
        {slots.map(slot => (
          <div
            key={slot.id}
            className="hq-slot"
            style={{
              left: slot.slot_x,
              top: slot.slot_y
            }}
          >
            {slot.label || "Empty"}
          </div>
        ))}
      </div>
    </div>
  );
}

import './hq-map.css';
