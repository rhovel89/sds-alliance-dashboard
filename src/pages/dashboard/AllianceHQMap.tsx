import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const [slots, setSlots] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");

  const upperAlliance = alliance_id?.toUpperCase();

  useEffect(() => {
    if (!upperAlliance) return;

    supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", upperAlliance)
      .then(({ data }) => setSlots(data || []));
  }, [upperAlliance]);

  useEffect(() => {
    if (!upperAlliance) return;

    const channel = supabase
      .channel("hq-map-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "alliance_hq_map",
          filter: `alliance_id=eq.${upperAlliance}`
        },
        () => {
          supabase
            .from("alliance_hq_map")
            .select("*")
            .eq("alliance_id", upperAlliance)
            .then(({ data }) => setSlots(data || []));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [upperAlliance]);

  const saveLabel = async (id: string) => {
    await supabase
      .from("alliance_hq_map")
      .update({ label: draftLabel })
      .eq("id", id);

    setEditingId(null);
    setDraftLabel("");
  };

  const deleteSlot = async (id: string) => {
    await supabase
      .from("alliance_hq_map")
      .delete()
      .eq("id", id);
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>🧟 HQ MAP LOADED FOR ALLIANCE: {upperAlliance}</h1>

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
            {editingId === slot.id ? (
              <>
                <input
                  value={draftLabel}
                  onChange={e => setDraftLabel(e.target.value)}
                  style={{ fontSize: 12 }}
                />
                <button onClick={() => saveLabel(slot.id)}>Save</button>
              </>
            ) : (
              <>
                <div>{slot.label || "HQ"}</div>
                <button
                  onClick={() => {
                    setEditingId(slot.id);
                    setDraftLabel(slot.label || "");
                  }}
                >
                  Edit
                </button>
                <button onClick={() => deleteSlot(slot.id)}>
                  Delete
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
