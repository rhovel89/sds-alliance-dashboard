import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

function s(v: any) { return v === null || v === undefined ? "" : String(v); }
function nowLocal() { try { return new Date().toLocaleString(); } catch { return ""; } }

type HqRow = {
  id?: string;
  profile_id?: string | null;
  player_id?: string | null;
  alliance_code?: string | null;
  alliance_id?: string | null;
  hq_name?: string | null;
  hq_level?: number | null;
  is_primary?: boolean | null;
  troop_type?: string | null;
  troop_tier?: string | null;
  troop_size?: number | null;
  march_size?: number | null;
  march_size_no_heroes?: number | null;
  rally_size?: number | null;
  coord_x?: number | null;
  coord_y?: number | null;
  updated_at?: string | null;
};

export default function PlayerDossierPage() {
  const nav = useNavigate();
  const params = useParams();
  const playerId = String((params as any)?.playerId || "");

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const [player, setPlayer] = useState<any | null>(null);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [hqRows, setHqRows] = useState<HqRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setStatus("");

      if (!playerId) {
        setStatus("Missing player id.");
        setLoading(false);
        return;
      }

      const p = await supabase.from("players").select("*").eq("id", playerId).maybeSingle();
      if (cancelled) return;

      if (p.error) {
        setStatus(p.error.message);
        setPlayer(null);
      } else {
        setPlayer(p.data || null);
      }

      const m = await supabase
        .from("player_alliances")
        .select("*")
        .eq("player_id", playerId)
        .order("alliance_code", { ascending: true });

      if (!cancelled) {
        if (m.error && !status) setStatus(m.error.message);
        setMemberships((m.data || []) as any[]);
      }

      let nextHqs: HqRow[] = [];

      try {
        const hqA = await supabase
          .from("player_alliance_hqs")
          .select("*")
          .eq("profile_id", playerId)
          .order("is_primary", { ascending: false })
          .order("updated_at", { ascending: false });

        if (!hqA.error && (hqA.data || []).length > 0) {
          nextHqs = (hqA.data || []) as HqRow[];
        } else {
          const hqB = await supabase
            .from("player_hqs")
            .select("*")
            .eq("profile_id", playerId)
            .order("updated_at", { ascending: false });

          if (!hqB.error) {
            nextHqs = (hqB.data || []) as HqRow[];
          }
        }
      } catch {
      }

      if (!cancelled) {
        setHqRows(nextHqs);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [playerId]);

  function printSheet() {
    try { window.print(); } catch {}
  }

  const primaryHq = hqRows.find((h) => h.is_primary === true) || hqRows[0] || null;

  return (
    <div style={{ width: "100%", maxWidth: 980, margin: "0 auto", display: "grid", gap: 12, padding: 16 }}>
      <div
        className="zombie-card"
        style={{
          padding: 18,
          background: "linear-gradient(180deg, rgba(16,20,26,0.98), rgba(8,10,14,0.94))",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 30, fontWeight: 950, lineHeight: 1.05 }}>Player Dossier Sheet</div>
            <div style={{ opacity: 0.84, marginTop: 10, lineHeight: 1.7 }}>
              Clean owner-view dossier for a single player.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" type="button" onClick={printSheet} style={{ padding: "10px 12px" }}>
              Print / Save PDF
            </button>
            <button className="zombie-btn" type="button" onClick={() => nav("/owner/dossier")} style={{ padding: "10px 12px" }}>
              Owner Lookup
            </button>
          </div>
        </div>
      </div>

      {loading ? <div style={{ opacity: 0.75 }}>Loading…</div> : null}

      {status ? (
        <div style={{ border: "1px solid rgba(176,18,27,0.35)", background: "rgba(176,18,27,0.12)", borderRadius: 12, padding: 10 }}>
          {status}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 950, fontSize: 16 }}>Identity</div>
              <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>Generated: {nowLocal()}</div>
            </div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>
              player_id: <code>{playerId || "(none)"}</code>
            </div>
          </div>

          {!player ? (
            <div style={{ marginTop: 12, opacity: 0.8 }}>
              No player record visible.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Display Name</div>
                <div style={{ fontWeight: 900 }}>{s(player.name || "(none)")}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Game Name</div>
                <div style={{ fontWeight: 900 }}>{s(player.game_name || player.name || "(none)")}</div>
              </div>
              <div style={{ gridColumn: "1 / -1", fontSize: 12, opacity: 0.72 }}>
                created_at: {player?.created_at ? new Date(String(player.created_at)).toLocaleString() : "—"}
                {" • "}
                updated_at: {player?.updated_at ? new Date(String(player.updated_at)).toLocaleString() : "—"}
              </div>
            </div>
          )}
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950, fontSize: 16 }}>Alliance Memberships</div>
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>Source: player_alliances</div>

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {memberships.map((m: any, i: number) => (
              <div key={String(m.id || i)} style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.18)", borderRadius: 12, padding: 10 }}>
                <div style={{ fontWeight: 900 }}>
                  {s(m.alliance_code || m.alliance_id || "Alliance")}
                  <span style={{ opacity: 0.7, fontWeight: 700 }}> • role: {s(m.role || "")}</span>
                </div>
              </div>
            ))}
            {!memberships.length ? <div style={{ opacity: 0.8 }}>No memberships found.</div> : null}
          </div>
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>HQ Summary</div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>{hqRows.length} HQ row(s)</div>
          </div>

          {primaryHq ? (
            <div style={{ marginTop: 10, fontSize: 13, opacity: 0.9 }}>
              Primary HQ: <b>{s(primaryHq.hq_name || "HQ")}{primaryHq.hq_level ? ` • HQ ${s(primaryHq.hq_level)}` : ""}</b>
            </div>
          ) : null}

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {hqRows.map((h, i) => (
              <div key={String(h.id || i)} style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.18)", borderRadius: 12, padding: 10 }}>
                <div style={{ fontWeight: 900 }}>
                  {h.is_primary ? "⭐ " : ""}
                  {s(h.hq_name || "HQ")}
                  {h.hq_level ? ` • HQ ${s(h.hq_level)}` : ""}
                </div>

                <div style={{ fontSize: 12, opacity: 0.78, marginTop: 6 }}>
                  Alliance: {s(h.alliance_code || h.alliance_id || "—")}
                  {h.troop_type ? ` • Type: ${s(h.troop_type)}` : ""}
                  {h.troop_tier ? ` • Tier: ${s(h.troop_tier)}` : ""}
                </div>

                <div style={{ fontSize: 12, opacity: 0.72, marginTop: 6 }}>
                  {h.coord_x != null && h.coord_y != null ? `Coords: ${s(h.coord_x)}, ${s(h.coord_y)}` : "Coords: —"}
                  {(h.march_size || h.march_size_no_heroes) ? ` • March: ${s(h.march_size || h.march_size_no_heroes)}` : ""}
                  {h.rally_size ? ` • Rally: ${s(h.rally_size)}` : ""}
                  {h.troop_size ? ` • Troops: ${s(h.troop_size)}` : ""}
                </div>
              </div>
            ))}
            {!hqRows.length ? <div style={{ opacity: 0.8 }}>No HQ rows found.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
