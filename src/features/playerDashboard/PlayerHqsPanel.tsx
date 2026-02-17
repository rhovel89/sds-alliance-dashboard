import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useResolvedPlayer } from "./useResolvedPlayer";

type HQ = {
  id: string;
  allianceCode: string;
  label?: string | null;
  slotNumber?: number | null;
  slotX?: number | null;
  slotY?: number | null;
  playerX?: number | null;
  playerY?: number | null;
  updatedAt?: string | null;
  source: "alliance_hq_map" | "alliance_hq_positions";
};

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

export function PlayerHqsPanel(props: { targetPlayerId?: string }) {
  const { loading: plLoading, error: plErr, targetAuthUserId, allianceCodes } = useResolvedPlayer(props.targetPlayerId);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hqs, setHqs] = useState<HQ[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setErr(null);
      setHqs([]);

      if (!targetAuthUserId) return;

      setLoading(true);
      try {
        // 1) Primary: alliance_hq_map
        const { data: mapRows, error: mapErr } = await supabase
          .from("alliance_hq_map")
          .select("id,alliance_id,label,slot_number,slot_x,slot_y,player_x,player_y,updated_at,assigned_user_id")
          .eq("assigned_user_id", targetAuthUserId);

        if (mapErr) throw mapErr;

        const mapHQs: HQ[] = (mapRows ?? []).map((r: any) => ({
          id: String(r.id),
          allianceCode: upper(r.alliance_id),
          label: r.label ?? null,
          slotNumber: (typeof r.slot_number === "number" ? r.slot_number : null),
          slotX: (typeof r.slot_x === "number" ? r.slot_x : null),
          slotY: (typeof r.slot_y === "number" ? r.slot_y : null),
          playerX: (typeof r.player_x === "number" ? r.player_x : null),
          playerY: (typeof r.player_y === "number" ? r.player_y : null),
          updatedAt: r.updated_at ?? null,
          source: "alliance_hq_map",
        })).filter(x => x.allianceCode);

        // 2) Fallback: alliance_hq_positions
        const { data: posRows, error: posErr } = await supabase
          .from("alliance_hq_positions")
          .select("id,alliance_id,x,y,updated_at,user_id")
          .eq("user_id", targetAuthUserId);

        if (posErr) throw posErr;

        const posHQs: HQ[] = (posRows ?? []).map((r: any) => ({
          id: String(r.id),
          allianceCode: upper(r.alliance_id),
          label: null,
          slotNumber: null,
          slotX: null,
          slotY: null,
          playerX: (typeof r.x === "number" ? r.x : null),
          playerY: (typeof r.y === "number" ? r.y : null),
          updatedAt: r.updated_at ?? null,
          source: "alliance_hq_positions",
        })).filter(x => x.allianceCode);

        // merge unique by alliance+coords (prefer map)
        const merged = [...mapHQs];
        const seen = new Set(merged.map(h => `${h.allianceCode}|${h.playerX ?? ""}|${h.playerY ?? ""}`));
        for (const h of posHQs) {
          const k = `${h.allianceCode}|${h.playerX ?? ""}|${h.playerY ?? ""}`;
          if (!seen.has(k)) {
            merged.push(h);
            seen.add(k);
          }
        }

        if (!cancelled) setHqs(merged);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [targetAuthUserId, allianceCodes.join("|")]);

  const byAlliance = useMemo(() => {
    const map: Record<string, HQ[]> = {};
    for (const h of (hqs || [])) {
      if (!map[h.allianceCode]) map[h.allianceCode] = [];
      map[h.allianceCode].push(h);
    }
    return map;
  }, [hqs]);

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>🏰 Your HQs</h3>
        <div style={{ opacity: 0.75, fontSize: 12 }}>
          View-only HQ map + daily events links
        </div>
      </div>

      {plLoading ? <div style={{ marginTop: 10, opacity: 0.8 }}>Loading…</div> : null}
      {plErr ? (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 12, border: "1px solid rgba(255,0,0,0.35)" }}>
          <b>Error:</b> {plErr}
        </div>
      ) : null}

      {loading ? <div style={{ marginTop: 10, opacity: 0.8 }}>Loading HQs…</div> : null}
      {err ? (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 12, border: "1px solid rgba(255,0,0,0.35)" }}>
          <b>Error:</b> {err}
        </div>
      ) : null}

      {!plLoading && !plErr && !loading && !err && hqs.length === 0 ? (
        <div style={{ marginTop: 10, opacity: 0.75 }}>No HQs found yet for this player.</div>
      ) : null}

      {Object.keys(byAlliance).length > 0 ? (
        <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
          {Object.entries(byAlliance).map(([code, list]) => (
            <div key={code} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>{code}</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link to={`/dashboard/${encodeURIComponent(code)}/hq-map`} style={{ opacity: 0.85 }}>HQ Map →</Link>
                  <Link to={`/dashboard/${encodeURIComponent(code)}/calendar`} style={{ opacity: 0.85 }}>Daily Events →</Link>
                </div>
              </div>

              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
                {list.map(hq => {
                  const coord = (hq.playerX != null && hq.playerY != null) ? `(${hq.playerX}, ${hq.playerY})` : "—";
                  const slot = (hq.slotNumber != null)
                    ? `Slot #${hq.slotNumber}`
                    : (hq.slotX != null && hq.slotY != null) ? `Slot (${hq.slotX}, ${hq.slotY})` : null;

                  return (
                    <div key={hq.id} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 800 }}>{hq.label || "Unnamed HQ"}</div>
                        <div style={{ opacity: 0.65, fontSize: 12 }}>{hq.source}</div>
                      </div>
                      <div style={{ marginTop: 6, opacity: 0.9 }}>
                        Player Coords: <b>{coord}</b>
                      </div>
                      {slot ? <div style={{ marginTop: 4, opacity: 0.8 }}>{slot}</div> : null}
                      <div style={{ marginTop: 6, opacity: 0.6, fontSize: 12 }}>
                        Updated: {hq.updatedAt ? new Date(hq.updatedAt).toLocaleString() : "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
