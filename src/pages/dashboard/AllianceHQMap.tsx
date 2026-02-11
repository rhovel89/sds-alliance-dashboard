import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useParams } from "react-router-dom";
import { usePermissions } from "../../hooks/usePermissions";

type HQSlot = {
  id: string;
  slot_x: number;
  slot_y: number;
  label: string | null;
};

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const permissions = usePermissions();

  const [slots, setSlots] = useState<HQSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const canEdit =
    permissions?.isOwner ||
    permissions?.role === "R5" ||
    permissions?.role === "R4";

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

  const addSlot = async () => {
    if (!canEdit || !alliance_id) return;

    await supabase.from("alliance_hq_map").insert({
      alliance_id: alliance_id.toUpperCase(),
      slot_x: 100,
      slot_y: 100,
      label: "New HQ",
    });

    window.location.reload();
  };

  const deleteSlot = async (id: string) => {
    if (!canEdit) return;

    await supabase.from("alliance_hq_map").delete().eq("id", id);
    window.location.reload();
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Loading HQ Map…</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>🧟 HQ Map — {alliance_id?.toUpperCase()}</h1>

      {canEdit && (
        <button
          className="zombie-btn"
          style={{ marginBottom: 16 }}
          onClick={addSlot}
        >
          ➕ Add HQ Slot
        </button>
      )}

      <div
        style={{
          position: "relative",
          width: 600,
          height: 600,
          border: "2px solid #444",
        }}
      >
        {slots.map((slot) => (
          <div
            key={slot.id}
            style={{
              position: "absolute",
              left: slot.slot_x,
              top: slot.slot_y,
              padding: "6px 10px",
              background: "#111",
              border: "1px solid #0f0",
              color: "#0f0",
            }}
          >
            {slot.label || "HQ"}

            {canEdit && (
              <button
                style={{
                  marginLeft: 8,
                  color: "red",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
                onClick={() => deleteSlot(slot.id)}
              >
                ✖
              </button>
            )}
          </div>
        ))}
      </div>

      {!canEdit && (
        <p style={{ opacity: 0.6, marginTop: 12 }}>
          View-only access
        </p>
      )}
    </div>
  );
}
