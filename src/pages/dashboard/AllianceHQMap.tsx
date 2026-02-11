import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = alliance_id?.toUpperCase() || "";
  const { canEdit } = useHQPermissions(upperAlliance);

  const [slots, setSlots] = useState<any[]>([]);

  const loadSlots = async () => {
    if (!upperAlliance) return;

    const { data } = await supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", upperAlliance);

    setSlots(data || []);
  };

  useEffect(() => {
    loadSlots();
  }, [upperAlliance]);

  const moveSlot = async (id: string, x: number, y: number) => {
    if (!canEdit) return;

    await supabase
      .from("alliance_hq_map")
      .update({ slot_x: x, slot_y: y })
      .eq("id", id);

    setSlots(prev =>
      prev.map(s => (s.id === id ? { ...s, slot_x: x, slot_y: y } : s))
    );
  };

  const updateSlot = async (id: string, updates: any) => {
    if (!canEdit) return;

    await supabase
      .from("alliance_hq_map")
      .update(updates)
      .eq("id", id);

    loadSlots();
  };

  const deleteSlot = async (id: string) => {
    if (!canEdit) return;

    await supabase
      .from("alliance_hq_map")
      .delete()
      .eq("id", id);

    setSlots(prev => prev.filter(s => s.id !== id));
  };

  const addSlot = async () => {
    if (!canEdit) return;

    await supabase.from("alliance_hq_map").insert({
      alliance_id: upperAlliance,
      slot_x: 100,
      slot_y: 100,
      label: "New HQ",
      player_x: null,
      player_y: null
    });

    loadSlots();
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>🧟 HQ MAP LOADED FOR ALLIANCE: {upperAlliance}</h1>

      {canEdit && (
        <button onClick={addSlot} style={{ marginBottom: 16 }}>
          ➕ Add HQ Slot
        </button>
      )}

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
            draggable={canEdit}
            onDragEnd={e => {
              const rect =
                (e.target as HTMLElement).parentElement!.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              moveSlot(slot.id, x, y);
            }}
            style={{
              position: "absolute",
              left: slot.slot_x,
              top: slot.slot_y,
              padding: 8,
              background: "#222",
              border: "1px solid lime",
              color: "lime",
              fontSize: 12,
              cursor: canEdit ? "grab" : "default",
              minWidth: 120
            }}
          >
            {canEdit ? (
              <>
                <input
                  value={slot.label || ""}
                  onChange={e =>
                    updateSlot(slot.id, { label: e.target.value })
                  }
                  style={{ width: "100%", marginBottom: 4 }}
                />

                <input
                  type="number"
                  placeholder="Player X"
                  value={slot.player_x || ""}
                  onChange={e =>
                    updateSlot(slot.id, {
                      player_x: e.target.value
                        ? parseInt(e.target.value)
                        : null
                    })
                  }
                  style={{ width: "48%", marginRight: "4%" }}
                />

                <input
                  type="number"
                  placeholder="Player Y"
                  value={slot.player_y || ""}
                  onChange={e =>
                    updateSlot(slot.id, {
                      player_y: e.target.value
                        ? parseInt(e.target.value)
                        : null
                    })
                  }
                  style={{ width: "48%" }}
                />

                <button
                  onClick={() => deleteSlot(slot.id)}
                  style={{
                    marginTop: 6,
                    width: "100%",
                    background: "#400",
                    color: "white",
                    border: "none"
                  }}
                >
                  🗑 Delete
                </button>
              </>
            ) : (
              <>
                <div>{slot.label || "HQ"}</div>
                {slot.player_x && slot.player_y && (
                  <div style={{ opacity: 0.7 }}>
                    ({slot.player_x}, {slot.player_y})
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
