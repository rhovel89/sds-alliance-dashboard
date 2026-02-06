import { useEffect, useMemo, useState } from "react";
import { useSession } from "../hooks/useSession";
import "../styles/hq-map-zombie.css";

type HQCell = {
  player_name?: string;
  coords?: string;
  hq_role?: "officer" | "scout" | "";
};

const COLUMNS = 10;
const TOTAL = 100;

function storageKey(allianceId: string) {
  return "hqmap:" + allianceId;
}

function safeParse(raw: string | null): HQCell[] | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return null;
    return v as HQCell[];
  } catch {
    return null;
  }
}

export default function HQMap() {
  const { session, loading } = useSession();

  // Until alliance context is wired, keep it stable:
  const activeAllianceId = "default";

  // Always initialize cells deterministically
  const empty = useMemo(() => Array.from({ length: TOTAL }, () => ({} as HQCell)), []);
  const [cells, setCells] = useState<HQCell[]>(empty);
  const [selected, setSelected] = useState<number | null>(null);

  // Hydrate from localStorage once we know we're running in browser
  useEffect(() => {
    const raw = localStorage.getItem(storageKey(activeAllianceId));
    const parsed = safeParse(raw);
    if (parsed && parsed.length === TOTAL) setCells(parsed);
    else if (parsed && parsed.length > 0) {
      // pad if needed
      const next = Array.from({ length: TOTAL }, (_, i) => parsed[i] || ({} as HQCell));
      setCells(next);
    }
  }, [activeAllianceId, empty]);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey(activeAllianceId), JSON.stringify(cells));
    } catch (e) {
      console.warn("[HQMap] localStorage save failed", e);
    }
  }, [cells, activeAllianceId]);

  // For now: everyone can VIEW. Editing gates come next (Owner/Mod/Officer).
  const canEdit = false;

  function updateCell(index: number, key: keyof HQCell, value: string) {
    setCells(prev => {
      const next = prev.slice();
      const current = next[index] || {};
      next[index] = { ...current, [key]: value };
      return next;
    });
  }

  if (loading) {
    return (
      <div className="hq-map-page">
        <h2 className="hq-map-title">🧟 Alliance HQ Map</h2>
        <div style={{ opacity: 0.8 }}>Loading session…</div>
      </div>
    );
  }

  // IMPORTANT: do NOT block rendering if session is missing.
  // Members can still view the map page; auth gating should be done in AuthGate/AppRoutes.
  const showBanner = !session;

  return (
    <div className="hq-map-page">
      <h2 className="hq-map-title">🧟 Alliance HQ Map</h2>

      {showBanner && (
        <div style={{ marginBottom: 12, opacity: 0.8 }}>
          Viewing as guest. Sign in for full access.
        </div>
      )}

      <div
        className="hq-map-grid"
        style={{ gridTemplateColumns: "repeat(" + COLUMNS + ", 1fr)" }}
      >
        {Array.from({ length: TOTAL }, (_, i) => {
          const cell = cells[i] || {};
          const hasOwner = !!cell.player_name;
          const statusClass = hasOwner ? "ally" : "empty";
          const selectedClass = selected === i ? "selected" : "";

          return (
            <div
              key={i}
              className={`hq-cell ${statusClass} ${selectedClass}`}
              onClick={() => setSelected(i)}
              title={`HQ ${i + 1}`}
            >
              <div className="hq-title">{cell.player_name || ""}</div>
              <div className="hq-coords">{cell.coords || "—"}</div>
            </div>
          );
        })}
      </div>

      {selected !== null && canEdit && (
        <div className="hq-editor">
          <h4>HQ {selected + 1}</h4>

          <input
            placeholder="Player Game Name"
            value={cells[selected]?.player_name || ""}
            onChange={(e) => updateCell(selected, "player_name", e.target.value)}
          />

          <input
            placeholder="Coordinates (e.g. X:123 Y:456)"
            value={cells[selected]?.coords || ""}
            onChange={(e) => updateCell(selected, "coords", e.target.value)}
          />

          <select
            value={cells[selected]?.hq_role || ""}
            onChange={(e) => updateCell(selected, "hq_role", e.target.value)}
          >
            <option value="">— No Role —</option>
            <option value="officer">Officer (Edit)</option>
            <option value="scout">Scout (View)</option>
          </select>
        </div>
      )}
    </div>
  );
}
