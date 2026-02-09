import "../styles/hq-map.css";
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { isAppOwner } from '../lib/isAppOwner';
import { useAllianceRole } from '../hooks/useAllianceRole';

type Cell = {
  player_name?: string;
  coords?: string;
};

const TOTAL_HQ = 400;
const COLUMNS = 20;
// Role derived from real permissions
function normalize(s: string) {
  return (s || "").trim();
}

export default function HQMap() {
  const navigate = useNavigate();
  const { allianceId } = useParams<{ alliance_id: string }>();
  const [cells, setCells] = useState<Cell[]>([]);
  const [disabledSlots, setDisabledSlots] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const role = useAllianceRole(allianceId);

  const isAppOwner = role === 'owner';
  const canEditRole = isAppOwner || role === 'R5' || role === 'R4';
  const canEdit = (isAppOwner || canEditRole) && !locked;  
  
      // Load HQ data (ALLIANCE-SCOPED)
  useEffect(() => {
    if (!allianceId) return;

    const load = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("alliance_hq_map")
        .select("slot_x, slot_y, label")
        .eq("alliance_id", allianceId);

      if (error) {
        console.error("HQ load failed:", error);
        setCells(Array.from({ length: TOTAL_HQ }, () => ({})));
        setLoading(false);
        return;
      }

      const next: Cell[] = Array.from({ length: TOTAL_HQ }, () => ({}));

      data.forEach(row => {
        const index = row.slot_y * COLUMNS + row.slot_x;
        if (index >= 0 && index < TOTAL_HQ) {
          next[index] = {
            player_name: row.label || undefined,
            coords: undefined
          };
        }
      });

      setCells(next);
      setLoading(false);
    };

    load();
  }, [allianceId]);

  const selectedCell = useMemo(() => {
    if (selected === null) return null;
    return cells[selected] ?? {};
  }, [cells, selected]);

  const [draftName, setDraftName] = useState("");
  const [draftCoords, setDraftCoords] = useState("");

  useEffect(() => {
    if (selected === null) return;
    const c = cells[selected] ?? {};
    setDraftName(c.player_name ?? "");
    setDraftCoords(c.coords ?? "");
  }, [selected, cells]);

  async function saveCell() {
    if (!canEdit || selected === null || !allianceId) return;

    const name = normalize(draftName);

    const x = selected % COLUMNS;
    const y = Math.floor(selected / COLUMNS);

    const { error } = await supabase
      .from("alliance_hq_map")
      .upsert({
        alliance_id: allianceId,
        slot_x: x,
        slot_y: y,
        label: name || null
      });

    if (error) {
      console.error("HQ save failed:", error);
      return;
    }

    setCells(prev => {
      const next = [...prev];
      next[selected] = { player_name: name || undefined };
      return next;
    });
  }

  async function clearCell() {
    if (!canEdit || selected === null || !allianceId) return;

    const x = selected % COLUMNS;
    const y = Math.floor(selected / COLUMNS);

    const { error } = await supabase
      .from("alliance_hq_map")
      .delete()
      .eq("alliance_id", allianceId)
      .eq("slot_x", x)
      .eq("slot_y", y);

    if (error) {
      console.error("HQ delete failed:", error);
      return;
    }

    setCells(prev => {
      const next = [...prev];
      next[selected] = {};
      return next;
    });

    setDraftName("");
    setDraftCoords("");
  }

  if (loading) {
    return <div className="hq-page"><div className="hq-shell">Loading HQ Map…</div></div>;
  }

  return (
    <div className="hq-page">
      <div className="hq-shell">

        <div className="hq-top">
          <div className="hq-title">HQ Map</div>

          <button
            type="button"
            className={"hq-lock " + (locked ? "is-locked" : "is-unlocked")}
            onClick={() => setLocked(v => !v)}
            disabled={!canEditRole}
          >
            {locked ? "Locked" : "Unlocked"}
          </button>
        </div>

        <div
          className="hq-grid"
          style={{ gridTemplateColumns: `repeat(${COLUMNS}, 1fr)` }}
        >
          {cells.map((cell, i) => {
            const isSel = selected === i;
            return (
              <button
                key={i}
                type="button"
                className={["hq-cell", isSel ? "selected" : "", disabledSlots.has(i) ? "disabled" : ""].join(" ")}
                onClick={() => canEditRole && !disabledSlots.has(i) && setSelected(i)}
              >
                <div className="hq-num">#{i + 1}</div>
                <div className="hq-name">
                  {cell.player_name || "— empty —"}
                </div>
              </button>
            );
          })}
        </div>

        {canEditRole && selected !== null && (
          <div className="hq-editor">
            <input
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              disabled={!canEdit}
            />
                        <div className="hq-editor-actions">
              <button onClick={saveCell} disabled={!canEdit}>Save</button>
              <button onClick={clearCell} disabled={!canEdit}>Clear</button>
              <button
                onClick={() => {
                  setDisabledSlots(prev => new Set(prev).add(selected));
                  setSelected(null);
                }}
                disabled={!canEdit}
              >
                Remove Slot
              </button>
              <button
                onClick={() => {
                  setDisabledSlots(prev => {
                    const next = new Set(prev);
                    next.delete(selected);
                    return next;
                  });
                }}
                disabled={!canEdit}
              >
                Restore Slot
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

import { logAllianceActivity } from '../lib/activityLogger';
async function logHQSave(alliance_id: string, slot: number, label: string) {
  try {
    await logAllianceActivity({
      allianceId,
      actionType: "hq_update",
      actionLabel: "HQ cell updated",
      metadata: { slot, label }
    });
  } catch {}
}
async function logHQClear(alliance_id: string, slot: number) {
  try {
    await logAllianceActivity({
      allianceId,
      actionType: "hq_clear",
      actionLabel: "HQ cell cleared",
      metadata: { slot }
    });
  } catch {}
}

import { isLeader } from '../lib/roleGuards';



