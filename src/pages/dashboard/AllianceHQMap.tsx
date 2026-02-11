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

  const updateSlot = async (id: string, updates: any) => {
    if (!canEdit) return;

    await supabase
      .from("alliance_hq_map")
      .update(updates)
      .eq("id", id);

    setSlots(prev =>
      prev.map(s => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>🧟 HQ MAP LOADED FOR ALLIANCE: {upperAlliance}</h1>

      <div
        style={{
          position: "relative",
          width: 800,
          height: 800,
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
              padding: 4,
              background: "#222",
              border: "1px solid lime",
              color: "lime",
              fontSize: 11,
              minWidth: 60
            }}
          >
            {canEdit ? (
              <>
                <input
                  value={slot.label || ""}
                  onChange={e =>
                    updateSlot(slot.id, { label: e.target.value })
                  }
                  style={{
                    width: "100%",
                    fontSize: 11,
                    background: "#111",
                    color: "lime",
                    border: "1px solid #333",
                    marginBottom: 4
                  }}
                />

                <div style={{ display: "flex", gap: 4 }}>
                  <input
                    type="number"
                    value={slot.slot_x}
                    onChange={e =>
                      updateSlot(slot.id, { slot_x: Number(e.target.value) })
                    }
                    style={{ width: 50, fontSize: 10 }}
                  />

                  <input
                    type="number"
                    value={slot.slot_y}
                    onChange={e =>
                      updateSlot(slot.id, { slot_y: Number(e.target.value) })
                    }
                    style={{ width: 50, fontSize: 10 }}
                  />
                </div>
              </>
            ) : (
              <div>{slot.label || "HQ"}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
