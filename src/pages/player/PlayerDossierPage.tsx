import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";
import { supabase } from "../../lib/supabaseClient";

function s(v: any) { return v === null || v === undefined ? "" : String(v); }
function nowLocal() { try { return new Date().toLocaleString(); } catch { return ""; } }
function safeNum(v: any) { const n = Number(v); return Number.isFinite(n) ? n : null; }

type PlayerHqSummary = {
  id?: string;
  profile_id?: string | null;
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

  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);
  function onSelectModule(k: string) { const to = cc.find(m => m.key === k)?.to; if (to) nav(to); }

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const [player, setPlayer] = useState<any | null>(null);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [hqs, setHqs] = useState<PlayerHqSummary[]>([]);

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
        if (m.error) setStatus((prev) => prev ? prev : m.error.message);
        setMemberships((m.data || []) as any[]);
      }

      let nextHqs: PlayerHqSummary[] = [];
      try {
        const hqA = await supabase
          .from("player_alliance_hqs")
          .select("*")
          .eq("profile_id", playerId);

        if (!hqA.error && (hqA.data ?? []).length > 0) {
          nextHqs = (hqA.data ?? []) as any[];
        } else {
          const hqB = await supabase
            .from("player_hqs")
            .select("*")
            .eq("profile_id", playerId);

          if (!hqB.error) nextHqs = (hqB.data ?? []) as any[];
        }
      } catch {
        // Keep dossier usable even if HQ table varies.
      }

      nextHqs.sort((a, b) => {
        const ap = a.is_primary === true ? 0 : 1;
        const bp = b.is_primary === true ? 0 : 1;
        if (ap !== bp) return ap - bp;

        const al = safeNum(a.hq_level) ?? 0;
        const bl = safeNum(b.hq_level) ?? 0;
        if (al !== bl) return bl - al;

        return String(a.hq_name || "").localeCompare(String(b.hq_name || ""));
      });

      if (!cancelled) {
        setHqs(nextHqs);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [playerId]);

  function printSheet() { try { window.print(); } catch {} }

  return (
    <CommandCenterShell
      title="Dossier Sheet"
      subtitle="Printable intel • memberships • HQ summary"
      modules={modules}
      activeModuleKey="dossier"
      onSelectModule={onSelectModule}
      topRight={
        <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
          <button className="zombie-btn" type="button" onClick={printSheet}>Print / Save PDF</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/dossier")}>Owner Lookup</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/players")}>Owner Players</button>
        </div>
      }
    >
      {loading ? <div style={{ opacity: 0.75 }}>Loading…</div> : null}

      {status ? (
        <div style={{ marginBottom: 10, border: "1px solid rgba(176,18,27,0.35)", background:"rgba(176,18,27,0.12)", borderRadius: 12, padding: 10 }}>
          {status}
        </div>
      ) : null}

      <div style={{ display:"grid", gridTemplateColumns:"1fr", gap: 12, maxWidth: 980 }}>
        <div style={{ border:"1px solid rgba(255,255,255,0.10)", background:"rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", gap: 10, flexWrap:"wrap" }}>
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
              No player record visible. If you are Owner/Admin and still see this, RLS is blocking read access.
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Display Name</div>
                <div style={{ fontWeight: 900 }}>{s(player.name || "(none)")}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Game Name</div>
                <div style={{ fontWeight: 900 }}>{s(player.game_name || player.name || "(none)")}</div>
              </div>
              <div style={{ gridColumn:"1 / -1", fontSize: 12, opacity: 0.7 }}>
                created_at: {player.created_at ? new Date(String(player.created_at)).toLocaleString() : ""} • updated_at: {player.updated_at ? new Date(String(player.updated_at)).toLocaleString() : ""}
              </div>
            </div>
          )}
        </div>

        <div style={{ border:"1px solid rgba(255,255,255,0.10)", background:"rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950, fontSize: 16 }}>Alliance Memberships</div>
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>Source: player_alliances (RLS enforced)</div>

          <div style={{ marginTop: 12, display:"flex", flexDirection:"column", gap: 8 }}>
            {memberships.map((m: any, i: number) => (
              <div key={String(m.id || i)} style={{ border:"1px solid rgba(255,255,255,0.08)", background:"rgba(0,0,0,0.18)", borderRadius: 12, padding: 10 }}>
                <div style={{ fontWeight: 900 }}>
                  {String(m.alliance_code || m.alliance_id || "Alliance")}
                  <span style={{ opacity: 0.7, fontWeight: 700 }}> • role: {String(m.role || "")}</span>
                </div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                  state_code: {String(m.state_code || "")} • created: {m.created_at ? new Date(String(m.created_at)).toLocaleString() : ""}
                </div>
              </div>
            ))}
            {!memberships.length ? <div style={{ opacity: 0.8 }}>No memberships found (or blocked by RLS).</div> : null}
          </div>
        </div>

        <div style={{ border:"1px solid rgba(255,255,255,0.10)", background:"rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950, fontSize: 16 }}>HQ Summary</div>
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
            Source: player_alliance_hqs, fallback player_hqs
          </div>

          <div style={{ marginTop: 12, display:"flex", flexDirection:"column", gap: 8 }}>
            {hqs.map((h: PlayerHqSummary, i: number) => (
              <div key={String(h.id || i)} style={{ border:"1px solid rgba(255,255,255,0.08)", background:"rgba(0,0,0,0.18)", borderRadius: 12, padding: 10 }}>
                <div style={{ fontWeight: 900 }}>
                  {h.is_primary ? "⭐ " : ""}
                  {String(h.hq_name || "HQ")}
                  {h.hq_level ? ` • HQ ${String(h.hq_level)}` : ""}
                </div>

                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
                  Alliance: {String(h.alliance_code || h.alliance_id || "—")}
                  {h.troop_type ? ` • Type: ${String(h.troop_type)}` : ""}
                  {h.troop_tier ? ` • Tier: ${String(h.troop_tier)}` : ""}
                </div>

                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                  {safeNum(h.coord_x) !== null && safeNum(h.coord_y) !== null
                    ? `Coords: ${String(h.coord_x)}, ${String(h.coord_y)}`
                    : "Coords: —"}
                  {(h.march_size ?? h.march_size_no_heroes) ? ` • March: ${String(h.march_size ?? h.march_size_no_heroes)}` : ""}
                  {h.rally_size ? ` • Rally: ${String(h.rally_size)}` : ""}
                  {h.troop_size ? ` • Troops: ${String(h.troop_size)}` : ""}
                </div>

                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                  updated: {h.updated_at ? new Date(String(h.updated_at)).toLocaleString() : "—"}
                </div>
              </div>
            ))}
            {!hqs.length ? <div style={{ opacity: 0.8 }}>No HQ rows found.</div> : null}
          </div>
        </div>
      </div>
    </CommandCenterShell>
  );
}
