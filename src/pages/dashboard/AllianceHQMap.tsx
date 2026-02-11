import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const [slots, setSlots] = useState<any[]>([]);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    if (!alliance_id) return;

    supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", alliance_id.toUpperCase())
      .then(({ data }) => setSlots(data || []));
  }, [alliance_id]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user || !alliance_id) return;

      if (user.id === "775966588200943616") {
        setCanEdit(true);
        return;
      }

      const { data: member } = await supabase
        .from("alliance_members")
        .select("role")
        .eq("alliance_id", alliance_id.toUpperCase())
        .eq("user_id", user.id)
        .single();

      if (member && ["R5", "R4"].includes(member.role)) {
        setCanEdit(true);
      }
    });
  }, [alliance_id]);

  const addSlot = async () => {
    if (!alliance_id) return;

    await supabase.from("alliance_hq_map").insert({
      alliance_id: alliance_id.toUpperCase(),
      slot_x: 100,
      slot_y: 100,
      label: "New HQ"
    });

    const { data } = await supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", alliance_id.toUpperCase());

    setSlots(data || []);
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>🧟 HQ MAP LOADED FOR ALLIANCE: {alliance_id?.toUpperCase()}</h1>

      {canEdit && (
        <button
          onClick={addSlot}
          style={{
            marginBottom: 12,
            padding: "6px 12px",
            background: "#111",
            border: "1px solid lime",
            color: "lime"
          }}
        >
          ➕ Add HQ Slot
        </button>
      )}

      {!canEdit && (
        <p style={{ opacity: 0.6 }}>Read-only view</p>
      )}

      <div style={{ position: "relative", width: 800, height: 800, border: "1px solid #444" }}>
        {slots.map(slot => (
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
              fontSize: 12
            }}
          >
            {slot.label || "HQ"}
          </div>
        ))}
      </div>
    </div>
  );
}
