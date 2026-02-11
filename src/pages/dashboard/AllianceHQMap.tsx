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

  const canEdit =
    permissions?.role === "owner" ||
    permissions?.role === "r5" ||
    permissions?.role === "r4";

  const [slots, setSlots] = useState<HQSlot[]>([]);
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

  const addSlot = async () => {
    if (!canEdit || !alliance_id) return;

    await supabase.from("alliance_hq_map").insert({
      alliance_id: alliance_id.toUpperCase(),
      slot_x: 0,
      slot_y: 0,
      label: "New HQ",
    });

    location.reload();
  };

  const deleteSlot = async (id: string) => {
    if (!canEdit) return;
    await supabase.from("alliance_hq_map").delete().eq("id", id);
    setSlots(slots.filter(s => s.id !== id));
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Loading HQ Map…</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>🧟 HQ MAP — {alliance_id?.toUpperCase()}</h1>

      {!canEdit && (
        <p style={{ opacity: 0.6 }}>
          View-only access (Members)
        </p>
      )}

      {canEdit && (
        <button onClick={addSlot} style={{ marginBottom: 12 }}>
          ➕ Add HQ Slot
        </button>
      )}

      <div
        style={{
          position: "relative",
          width: 600,
          height: 600,
          border: "2px solid #444",
          background: "#111",
        }}
      >
        {slots.map(slot => (
          <div
            key={slot.id}
            style={{
              position: "absolute",
              left: slot.slot_x,
              top: slot.slot_y,
              padding: "6px 10px",
              background: "#222",
              border: "1px solid #666",
              color: "#0f0",
              cursor: canEdit ? "pointer" : "default",
            }}
          >
            <strong>{slot.label || "HQ"}</strong>
            <br />
            X:{slot.slot_x} Y:{slot.slot_y}
            {canEdit && (
              <div>
                <button onClick={() => deleteSlot(slot.id)}>🗑️</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
