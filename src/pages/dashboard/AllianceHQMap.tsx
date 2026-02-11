import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { canEditHQ } from "../../utils/canEditHQ";

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const [slots, setSlots] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
  }, []);

  useEffect(() => {
    if (!alliance_id) return;

    supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", alliance_id.toUpperCase())
      .then(({ data }) => setSlots(data || []));

    supabase
      .from("alliance_members")
      .select("role")
      .eq("alliance_id", alliance_id.toUpperCase())
      .single()
      .then(({ data }) => setRole(data?.role || null));
  }, [alliance_id]);

  const allowEdit = canEditHQ(session, role);

  async function addHQ() {
    if (!alliance_id) return;

    await supabase.from("alliance_hq_map").insert({
      alliance_id: alliance_id.toUpperCase(),
      slot_x: 100,
      slot_y: 100,
      label: "New HQ"
    });

    location.reload();
  }

  async function deleteHQ(id: string) {
    await supabase.from("alliance_hq_map").delete().eq("id", id);
    location.reload();
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>🧟 HQ MAP LOADED FOR ALLIANCE: {alliance_id?.toUpperCase()}</h1>

      {allowEdit && (
        <button onClick={addHQ} style={{ marginBottom: 12 }}>
          ➕ Add HQ
        </button>
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

            {allowEdit && (
              <div>
                <button onClick={() => deleteHQ(slot.id)}>🗑</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
