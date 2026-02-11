import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = alliance_id?.toUpperCase() || "";
  const { canEdit } = useHQPermissions(upperAlliance);

  const [slots, setSlots] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  // Load slots
  useEffect(() => {
    if (!upperAlliance) return;

    supabase
      .from("alliance_hq_map")
      .select("*")
      .eq("alliance_id", upperAlliance)
      .then(({ data }) => setSlots(data || []));

    const channel = supabase
      .channel("hq-map-" + upperAlliance)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alliance_hq_map", filter: `alliance_id=eq.${upperAlliance}` },
        payload => {
          if (payload.eventType === "INSERT") {
            setSlots(prev => [...prev, payload.new]);
          }
          if (payload.eventType === "UPDATE") {
            setSlots(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
          }
          if (payload.eventType === "DELETE") {
            setSlots(prev => prev.filter(s => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [upperAlliance]);

  const moveSlot = async (id: string, x: number, y: number) => {
    if (!canEdit) return;

    await supabase
      .from("alliance_hq_map")
      .update({ slot_x: x, slot_y: y })
      .eq("id", id);
  };

  const addSlot = async (x: number, y: number) => {
    if (!canEdit) return;

    await supabase.from("alliance_hq_map").insert({
      alliance_id: upperAlliance,
      slot_x: x,
      slot_y: y,
      label: "New HQ"
    });
  };

  const deleteSlot = async (id: string) => {
    if (!canEdit) return;

    await supabase
      .from("alliance_hq_map")
      .delete()
      .eq("id", id);
  };

  const saveLabel = async (id: string) => {
    if (!canEdit) return;

    await supabase
      .from("alliance_hq_map")
      .update({ label: editingValue })
      .eq("id", id);

    setEditingId(null);
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
        onDoubleClick={e => {
          if (!canEdit) return;
          const rect = (e.target as HTMLElement).getBoundingClientRect();
          addSlot(e.clientX - rect.left, e.clientY - rect.top);
        }}
      >
        {slots.map(slot => (
          <div
            key={slot.id}
            draggable={canEdit}
            onDragEnd={e => {
              const rect = (e.target as HTMLElement).parentElement!.getBoundingClientRect();
              moveSlot(slot.id, e.clientX - rect.left, e.clientY - rect.top);
            }}
            onDoubleClick={() => {
              if (!canEdit) return;
              setEditingId(slot.id);
              setEditingValue(slot.label || "");
            }}
            style={{
              position: "absolute",
              left: slot.slot_x,
              top: slot.slot_y,
              padding: 6,
              background: "#222",
              border: "1px solid lime",
              color: "lime",
              fontSize: 12,
              cursor: canEdit ? "grab" : "default"
            }}
          >
            {editingId === slot.id ? (
              <input
                autoFocus
                value={editingValue}
                onChange={e => setEditingValue(e.target.value)}
                onBlur={() => saveLabel(slot.id)}
                onKeyDown={e => {
                  if (e.key === "Enter") saveLabel(slot.id);
                }}
              />
            ) : (
              <>
                {slot.label || "HQ"}
                {canEdit && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      deleteSlot(slot.id);
                    }}
                    style={{
                      marginLeft: 6,
                      background: "red",
                      color: "white",
                      border: "none",
                      cursor: "pointer"
                    }}
                  >
                    ✕
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
