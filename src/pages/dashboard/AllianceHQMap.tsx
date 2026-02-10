import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { usePermissions } from "../../hooks/usePermissions";

type HQSlot = {
  id: string;
  label: string | null;
  slot_x: number;
  slot_y: number;
};

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const permissions = usePermissions();
  const [slots, setSlots] = useState<HQSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!alliance_id) return;

    supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", alliance_id)
      .order("slot_y", { ascending: true })
      .order("slot_x", { ascending: true })
      .then(({ data }) => {
        setSlots(data || []);
        setLoading(false);
      });
  }, [alliance_id]);

  if (loading) {
    return <div className="zombie-spinner" />;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>🗺️ Alliance HQ Map</h1>

      <div className="hq-grid">
        {slots.map((slot) => (
          <div key={slot.id} className="hq-slot">
            <strong>{slot.label || "Empty"}</strong>
            <div>X:{slot.slot_x} Y:{slot.slot_y}</div>
          </div>
        ))}
      </div>

      {!permissions.canManageRoles && (
        <p style={{ opacity: 0.6 }}>Read-only view</p>
      )}
    </div>
  );
}
