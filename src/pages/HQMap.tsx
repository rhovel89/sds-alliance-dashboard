import "../styles/hq-map.css";
import { useEffect, useMemo, useState } from "react";
import { supabase } from '../lib/supabaseClient';

type Cell = {
  player_name?: string;
  coords?: string;
};

const TOTAL_HQ = 120;
const COLUMNS = 6;
const STORAGE_KEY = "hqmap:data:v1";

// 🔐 TEMP ROLE SIMULATION (replace later with real auth/roles)
const role: "owner" | "mod" | "member" = "owner";

function normalizeCoords(s: string) {
  return (s || "").trim();
}

function normalizeName(s: string) {
  return (s || "").trim();
}

export default function HQMap() {
  const [cells, setCells] = useState<Cell[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);

  const canEditRole = role === "owner" || role === "mod";
  const canEdit = canEditRole && !locked;

  // editor draft
  const selectedCell = useMemo(() => {
    if (selected === null) return null;
    return cells[selected] ?? {};
  }, [cells, selected]);

  const [draftName, setDraftName] = useState("");
  const [draftCoords, setDraftCoords] = useState("");

  // 🔄 Load saved HQ data
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // pad/truncate to TOTAL_HQ
          const fixed = parsed.slice(0, TOTAL_HQ);
          while (fixed.length < TOTAL_HQ) fixed.push({});
          setCells(fixed);
          return;
        }
      } catch {}
    }
    setCells(Array.from({ length: TOTAL_HQ }, () => ({})));
  }, []);

  // 💾 Persist on change
  useEffect(() => {
    if (cells.length === TOTAL_HQ) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cells));
    }
  }, [cells]);

  // keep draft in sync when selecting a cell
  useEffect(() => {
    if (selected === null) return;
    const c = cells[selected] ?? {};
    setDraftName(c.player_name ?? "");
    setDraftCoords(c.coords ?? "");
  }, [selected, cells]);

  function applyDraft() {
    if (!canEdit || selected === null) return;

    const name = normalizeName(draftName);
    const coords = normalizeCoords(draftCoords);

    setCells(prev => {
      const next = [...prev];
      next[selected] = {
        player_name: name || undefined,
        coords: coords || undefined
      };
      return next;
    });
  }

  function clearCell() {
    if (!canEdit || selected === null) return;

    setCells(prev => {
      const next = [...prev];
      next[selected] = {};
      return next;
    });
    setDraftName("");
    setDraftCoords("");
  }

  if (cells.length !== TOTAL_HQ) {
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
            title={!canEditRole ? "Only owner/mod can edit" : (locked ? "Click to unlock" : "Click to lock")}
          >
            <span className="dot" />
            {locked ? "Locked (click to unlock)" : "Unlocked (click to lock)"}
          </button>
        </div>

        <div className="hq-sub">
          Drag to swap cells • Click a cell to edit
        </div>

        <div
          className="hq-grid"
          style={{ gridTemplateColumns: `repeat(${COLUMNS}, 1fr)` }}
        >
          {cells.map((cell, i) => {
            const n = i + 1;
            const has = !!(cell.player_name || cell.coords);
            const isSel = selected === i;

            return (
              <button
                type="button"
                key={i}
                className={[
                  "hq-cell",
                  has ? "ally" : "empty",
                  isSel ? "selected" : ""
                ].join(" ")}
                onClick={() => {
                  if (!canEditRole) return;
                  setSelected(i);
                }}
              >
                <div className="hq-cell-top">
                  <div className="hq-num">#{n}</div>
                </div>

                <div className="hq-coords">
                  {cell.coords ? cell.coords : "(no coords)"}
                </div>

                <div className="hq-name">
                  {cell.player_name ? cell.player_name : "— empty —"}
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom editor */}
        {canEditRole && selected !== null && (
          <div className="hq-editor">
            <div className="hq-editor-head">
              <div className="hq-editor-title">Edit Cell #{selected + 1}</div>
              <button
                type="button"
                className="hq-editor-close"
                onClick={() => setSelected(null)}
              >
                Close
              </button>
            </div>

            <div className="hq-editor-grid">
              <div className="hq-field">
                <label>Name</label>
                <input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder=""
                  disabled={!canEdit}
                />
              </div>

              <div className="hq-field">
                <label>Coords</label>
                <input
                  value={draftCoords}
                  onChange={(e) => setDraftCoords(e.target.value)}
                  placeholder="e.g. S:789 Y:232 X:111"
                  disabled={!canEdit}
                />
              </div>
            </div>

            <div className="hq-editor-actions">
              <button type="button" className="hq-btn primary" onClick={applyDraft} disabled={!canEdit}>
                Save
              </button>
              <button type="button" className="hq-btn danger" onClick={clearCell} disabled={!canEdit}>
                Clear Cell
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
