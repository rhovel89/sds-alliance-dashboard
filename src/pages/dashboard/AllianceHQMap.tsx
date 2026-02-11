import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = alliance_id?.toUpperCase() || "";
  const { canEdit } = useHQPermissions(upperAlliance);

  const [slots, setSlots] = useState<any[]>([]);

  // Load slots
  useEffect(() => {
    if (!upperAlliance) return;

    loadSlots();
  }, [upperAlliance]);

  async function loadSlots() {
    const { data } = await supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", upperAlliance);

    setSlots(data || []);
  }

  // REALTIME LISTENER
  useEffect(() => {
    if (!upperAlliance) return;

    const channel = supabase
      .channel("hq-map-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "alliance_hq_map",
          filter: `alliance_id=eq.${upperAlliance}`,
        },
        () => {
          loadSlots();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [upperAlliance]);

  async function deleteSlot(id: string) {
    if (!canEdit) return;

    await supabase
      .from("alliance_hq_map")
      .delete()
      .eq("id", id);
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>🧟 HQ MAP LOADED FOR ALLIANCE: {upperAlliance}</h1>

      {slots.length === 0 && (
        <p style={{ opacity: 0.6 }}>No HQ slots found</p>
      )}

      <div
        style={{
          position: "relative",
          width: 800,
          height: 800,
          border: "1px solid #444",
        }}
      >
        {slots.map((slot) => (
          <div
            key={slot.id}
            style={{
              position: "absolute",
              left: slot.slot_x,
              top: slot.slot_y,
              padding: 6,
              background: "#222",
              border: "1px solid lime",
              color: "lime",
              fontSize: 12,
              cursor: canEdit ? "pointer" : "default",
            }}
            onDoubleClick={() => deleteSlot(slot.id)}
          >
            {slot.label || "HQ"}
          </div>
        ))}
      </div>
    </div>
  );
}
