import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";

type HQSlot = {
  id: string;
  alliance_id: string;
  slot_x: number;
  slot_y: number;
  label: string | null;
};

const GRID_SIZE = 800; // UI canvas size
const MIN_COORD = 0;
const MAX_COORD = 999; // DB target bounds (adjust via SQL below if needed)

function clampInt(n: number, min: number, max: number) {
  const x = Math.round(n);
  return Math.max(min, Math.min(max, x));
}

export default function AllianceHQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const upperAlliance = useMemo(() => (alliance_id || "").toUpperCase(), [alliance_id]);

  const perms = useHQPermissions(upperAlliance);
  const canEdit = perms.canEdit;

  const [slots, setSlots] = useState<HQSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const boardRef = useRef<HTMLDivElement | null>(null);

  // Drag state (pointer-based, reliable)
  const dragRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
  } | null>(null);

  const load = async () => {
    if (!upperAlliance) return;
    setErrMsg(null);
    setLoading(true);

    const { data, error } = await supabase
      .from("alliance_hq_map")
      .select("id, alliance_id, slot_x, slot_y, label")
      .eq("alliance_id", upperAlliance)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("HQ Map load failed:", error);
      setErrMsg(`Load failed: ${error.message}`);
      setSlots([]);
    } else {
      setSlots((data as HQSlot[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upperAlliance]);

  // Realtime sync (keeps refresh consistent + multi-user live)
  useEffect(() => {
    if (!upperAlliance) return;

    const channel = supabase
      .channel(`hqmap:${upperAlliance}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alliance_hq_map", filter: `alliance_id=eq.${upperAlliance}` },
        () => {
          // Reload on any change to avoid drift
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upperAlliance]);

  const updateSlot = async (id: string, patch: Partial<Pick<HQSlot, "slot_x" | "slot_y" | "label">>) => {
    if (!canEdit) return;

    setErrMsg(null);

    const { error } = await supabase
      .from("alliance_hq_map")
      .update(patch)
      .eq("id", id);

    if (error) {
      console.error("Update failed:", error);
      setErrMsg(`Save failed: ${error.message}`);
      return false;
    }
    return true;
  };

  const addSlot = async () => {
    if (!canEdit) return;

    setErrMsg(null);

    const payload = {
      alliance_id: upperAlliance,
      slot_x: 40,
      slot_y: 40,
      label: "New HQ"
    };

    const { data, error } = await supabase
      .from("alliance_hq_map")
      .insert(payload)
      .select("id, alliance_id, slot_x, slot_y, label")
      .single();

    if (error) {
      console.error("Insert failed:", error);
      setErrMsg(`Add failed: ${error.message}`);
      return;
    }

    setSlots(prev => [...prev, data as HQSlot]);
  };

  const deleteSlot = async (id: string) => {
    if (!canEdit) return;
    setErrMsg(null);

    const ok = window.confirm("Delete this HQ slot?");
    if (!ok) return;

    const { error } = await supabase
      .from("alliance_hq_map")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete failed:", error);
      setErrMsg(`Delete failed: ${error.message}`);
      return;
    }

    setSlots(prev => prev.filter(s => s.id !== id));
  };

  // Pointer drag handlers (works better than HTML5 drag)
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>, slot: HQSlot) => {
    if (!canEdit) return;
    if (!boardRef.current) return;

    const boardRect = boardRef.current.getBoundingClientRect();
    const targetRect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();

    const offsetX = e.clientX - targetRect.left;
    const offsetY = e.clientY - targetRect.top;

    dragRef.current = {
      id: slot.id,
      offsetX,
      offsetY,
      startX: targetRect.left - boardRect.left,
      startY: targetRect.top - boardRect.top
    };

    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canEdit) return;
    if (!boardRef.current) return;
    if (!dragRef.current) return;

    const boardRect = boardRef.current.getBoundingClientRect();
    const x = e.clientX - boardRect.left - dragRef.current.offsetX;
    const y = e.clientY - boardRect.top - dragRef.current.offsetY;

    // Optimistic UI move (clamped to canvas)
    setSlots(prev =>
      prev.map(s => {
        if (s.id !== dragRef.current!.id) return s;
        return {
          ...s,
          slot_x: clampInt(x, MIN_COORD, GRID_SIZE - 10),
          slot_y: clampInt(y, MIN_COORD, GRID_SIZE - 10)
        };
      })
    );
  };

  const onPointerUp = async () => {
    if (!canEdit) return;
    if (!dragRef.current) return;

    const id = dragRef.current.id;
    dragRef.current = null;

    // Persist after drag ends using current state values
    const slot = slots.find(s => s.id === id);
    if (!slot) return;

    // Persist in DB bounds space (0..999 by default)
    const dbX = clampInt(slot.slot_x, MIN_COORD, MAX_COORD);
    const dbY = clampInt(slot.slot_y, MIN_COORD, MAX_COORD);

    const saved = await updateSlot(id, { slot_x: dbX, slot_y: dbY });
    if (!saved) {
      // If save failed, reload from server to restore truth
      await load();
    }
  };

  const editLabel = async (slot: HQSlot) => {
    if (!canEdit) return;

    const next = window.prompt("HQ Label:", slot.label ?? "");
    if (next === null) return;

    // Optimistic
    setSlots(prev => prev.map(s => (s.id === slot.id ? { ...s, label: next } : s)));

    const saved = await updateSlot(slot.id, { label: next });
    if (!saved) await load();
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ margin: 0 }}>🧟 HQ MAP LOADED FOR ALLIANCE: {upperAlliance}</h1>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ opacity: 0.75, fontSize: 12 }}>
            {perms.loading ? "Checking permissions..." : canEdit ? "Editor" : "View only"}
          </span>

          {canEdit && (
            <button className="zombie-btn" onClick={addSlot}>
              + Add HQ Slot
            </button>
          )}
        </div>
      </div>

      {errMsg && (
        <div style={{ marginTop: 12, padding: 10, border: "1px solid #a00", color: "#f88", background: "rgba(120,0,0,0.2)" }}>
          {errMsg}
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
            If this keeps happening, it’s almost certainly RLS or the bounds constraint. Run the SQL printed by the deploy script.
          </div>
        </div>
      )}

      {loading && <p style={{ opacity: 0.7 }}>Loading HQ slots…</p>}

      {!loading && slots.length === 0 && (
        <p style={{ opacity: 0.6 }}>No HQ slots found</p>
      )}

      <div
        ref={boardRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{
          marginTop: 16,
          position: "relative",
          width: GRID_SIZE,
          height: GRID_SIZE,
          border: "1px solid #444",
          background: "rgba(0,0,0,0.25)",
          overflow: "hidden"
        }}
      >
        {slots.map(slot => (
          <div
            key={slot.id}
            onPointerDown={(e) => onPointerDown(e, slot)}
            style={{
              position: "absolute",
              left: clampInt(slot.slot_x, MIN_COORD, GRID_SIZE - 10),
              top: clampInt(slot.slot_y, MIN_COORD, GRID_SIZE - 10),
              padding: "6px 8px",
              background: "rgba(10,10,10,0.92)",
              border: "1px solid lime",
              color: "lime",
              fontSize: 12,
              cursor: canEdit ? "grab" : "default",
              userSelect: "none",
              display: "flex",
              alignItems: "center",
              gap: 8
            }}
            title={canEdit ? "Drag to move • Double-click to edit label" : "View only"}
            onDoubleClick={() => editLabel(slot)}
          >
            <span style={{ whiteSpace: "nowrap" }}>{slot.label || "HQ"}</span>

            {canEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); deleteSlot(slot.id); }}
                style={{
                  border: "1px solid #a33",
                  background: "rgba(100,0,0,0.25)",
                  color: "#f99",
                  fontSize: 11,
                  padding: "2px 6px",
                  cursor: "pointer"
                }}
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
