import "../styles/hq-map.css";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAllianceRole } from "../hooks/useAllianceRole";

type Cell = {
  player_name?: string;
};

const TOTAL_HQ = 400;
const COLUMNS = 20;

export default function HQMap() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const role = useAllianceRole(alliance_id);
  const [cells, setCells] = useState<Cell[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  

  // 🔒 Load lock state
  useEffect(() => {
    if (!alliance_id) {
  if (!Array.isArray(next) || next.length !== TOTAL_HQ) {
    setCells(Array.from({ length: TOTAL_HQ }, () => ({})));
}
setLoading(false);
  return;
}

    supabase
      .from("alliance_settings")
      .select("hq_locked")
      .eq("alliance_id", alliance_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setLocked(!!data.hq_locked);
      });
  }, [alliance_id]);

  // 🗺️ Load HQ map
  useEffect(() => {
    if (!alliance_id) {
  if (!Array.isArray(next) || next.length !== TOTAL_HQ) {
    setCells(Array.from({ length: TOTAL_HQ }, () => ({})));
}
setLoading(false);
  return;
}

    const load = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("alliance_hq_map")
        .select("slot_x, slot_y, label")
        .eq("alliance_id", alliance_id);

      const next: Cell[] = Array.from({ length: TOTAL_HQ }, () => ({}));

      if (!error && data) {
        data.forEach(row => {
          const index = row.slot_y * COLUMNS + row.slot_x;
          if (index >= 0 && index < TOTAL_HQ) {
            next[index] = { player_name: row.label ?? undefined };
          }
        });
      }

      setCells(next);
      if (!Array.isArray(next) || next.length !== TOTAL_HQ) {
    setCells(Array.from({ length: TOTAL_HQ }, () => ({})));
}
setLoading(false);
    };

    load();
  }, [alliance_id]);

  if (cells.length !== TOTAL_HQ) {
    setCells(Array.from({ length: TOTAL_HQ }, () => ({})));
  }

  if (loading) {
    return (
      <div className="hq-page">
        <div className="hq-shell">Loading HQ Map…</div>
      </div>
    );
  }

  async function saveCell() {
    if (!canEdit || selected === null || !alliance_id) return;

    const x = selected % COLUMNS;
    const y = Math.floor(selected / COLUMNS);
    const name = cells[selected]?.player_name ?? null;

    await supabase.from("alliance_hq_map").upsert({
      alliance_id: alliance_id,
      slot_x: x,
      slot_y: y,
      label: name
    });
  }

  async function clearCell() {
    if (!canEdit || selected === null || !alliance_id) return;

    const x = selected % COLUMNS;
    const y = Math.floor(selected / COLUMNS);

    await supabase
      .from("alliance_hq_map")
      .delete()
      .eq("alliance_id", alliance_id)
      .eq("slot_x", x)
      .eq("slot_y", y);

    setCells(prev => {
      const next = [...prev];
      next[selected] = {};
      return next;
    });
  }

  return (
    <div className="hq-page">
      <div className="hq-shell">

        <div className="hq-top">
          <div className="hq-title">HQ Map</div>

          <button
            className={"hq-lock " + (locked ? "is-locked" : "is-unlocked")}
            disabled={!canEditRole}
            onClick={() => setLocked(v => !v)}
          >
            {locked ? "Locked" : "Unlocked"}
          </button>
        </div>

        <div
          className="hq-grid"
          style={{ gridTemplateColumns: `repeat(${COLUMNS}, 1fr)` }}
        >
          {cells.map((cell, i) => (
            <button
              key={i}
              className={"hq-cell " + (selected === i ? "selected" : "")}
              onClick={() => canEditRole && setSelected(i)}
            >
              <div className="hq-num">#{i + 1}</div>
              <div className="hq-name">{cell.player_name || "— empty —"}</div>
            </button>
          ))}
        </div>

        {canEditRole && selected !== null && (
          <div className="hq-editor">
            <input
              value={cells[selected]?.player_name || ""}
              onChange={e =>
                setCells(prev => {
                  const next = [...prev];
                  next[selected] = { player_name: e.target.value };
                  return next;
                })
              }
              disabled={!canEdit}
            />
            <div className="hq-editor-actions">
              <button onClick={saveCell} disabled={!canEdit}>Save</button>
              <button onClick={clearCell} disabled={!canEdit}>Clear</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
