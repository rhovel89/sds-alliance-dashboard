import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useResolvedPlayer } from "./useResolvedPlayer";

type HQDetail = {
  allianceCode: string;
  x: number;
  y: number;
  hq_label?: string | null;
  player_name?: string | null;
  notes?: string | null;
  building_type?: string | null;
  label?: string | null;
};

function upper(v: any) { return String(v ?? "").trim().toUpperCase(); }

export function PlayerHqDetailsPanel(props: { targetPlayerId?: string }) {
  const { loading: plLoading, error: plErr, targetAuthUserId } = useResolvedPlayer(props.targetPlayerId);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [details, setDetails] = useState<HQDetail[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setErr(null);
      setDetails([]);

      if (!targetAuthUserId) return;

      setLoading(true);
      try {
        // Pull HQ coords from alliance_hq_map first
        const { data: mapRows, error: mapErr } = await supabase
          .from("alliance_hq_map")
          .select("alliance_id,player_x,player_y")
          .eq("assigned_user_id", targetAuthUserId);

        if (mapErr) throw mapErr;

        const coords = (mapRows ?? [])
          .map((r: any) => ({
            allianceCode: upper(r.alliance_id),
            x: typeof r.player_x === "number" ? r.player_x : null,
            y: typeof r.player_y === "number" ? r.player_y : null,
          }))
          .filter((c: any) => c.allianceCode && c.x != null && c.y != null);

        if (coords.length === 0) { setLoading(false); return; }

        // Best-effort: for each HQ coord, try match in hq_map table
        const found: HQDetail[] = [];
        for (const c of coords.slice(0, 12)) {
          const { data, error } = await supabase
            .from("hq_map")
            .select("alliance_id,coord_x,coord_y,hq_label,player_name,notes,building_type,label")
            .eq("alliance_id", c.allianceCode)
            .eq("coord_x", c.x)
            .eq("coord_y", c.y)
            .limit(1);

          if (!error && data && data.length > 0) {
            const r: any = data[0];
            found.push({
              allianceCode: c.allianceCode,
              x: c.x,
              y: c.y,
              hq_label: r.hq_label ?? null,
              player_name: r.player_name ?? null,
              notes: r.notes ?? null,
              building_type: r.building_type ?? null,
              label: r.label ?? null,
            });
          }
        }

        if (!cancelled) setDetails(found);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [targetAuthUserId]);

  const grouped = useMemo(() => {
    const m: Record<string, HQDetail[]> = {};
    for (const d of (details || [])) {
      if (!m[d.allianceCode]) m[d.allianceCode] = [];
      m[d.allianceCode].push(d);
    }
    return m;
  }, [details]);

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>🧾 HQ Details</h3>
        <div style={{ opacity: 0.75, fontSize: 12 }}>
          Best-effort from hq_map (coords match)
        </div>
      </div>

      {plLoading ? <div style={{ marginTop: 10, opacity: 0.8 }}>Loading…</div> : null}
      {plErr ? (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 12, border: "1px solid rgba(255,0,0,0.35)" }}>
          <b>Error:</b> {plErr}
        </div>
      ) : null}

      {loading ? <div style={{ marginTop: 10, opacity: 0.8 }}>Loading details…</div> : null}
      {err ? (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 12, border: "1px solid rgba(255,0,0,0.35)" }}>
          <b>Error:</b> {err}
        </div>
      ) : null}

      {!plLoading && !plErr && !loading && !err && details.length === 0 ? (
        <div style={{ marginTop: 10, opacity: 0.75 }}>
          No extra HQ details found yet (this is OK — we can expand later when you provide the HQ info format).
        </div>
      ) : null}

      {Object.keys(grouped).length > 0 ? (
        <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
          {Object.entries(grouped).map(([code, list]) => (
            <div key={code} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 12 }}>
              <div style={{ fontWeight: 900 }}>{code}</div>
              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
                {list.map((d, idx) => (
                  <div key={`${d.allianceCode}-${d.x}-${d.y}-${idx}`} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 10 }}>
                    <div style={{ fontWeight: 800 }}>
                      {d.hq_label || d.label || "HQ"}
                      <span style={{ marginLeft: 8, opacity: 0.7, fontSize: 12 }}>({d.x}, {d.y})</span>
                    </div>
                    {d.building_type ? <div style={{ marginTop: 6, opacity: 0.85 }}>Type: <b>{d.building_type}</b></div> : null}
                    {d.notes ? <div style={{ marginTop: 6, opacity: 0.85, whiteSpace: "pre-wrap" }}>{d.notes}</div> : null}
                    {d.player_name ? <div style={{ marginTop: 6, opacity: 0.6, fontSize: 12 }}>Player: {d.player_name}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
