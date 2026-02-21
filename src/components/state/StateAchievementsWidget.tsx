import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type AnyRow = Record<string, any>;

function normLower(v: any) { return String(v || "").trim().toLowerCase(); }
function asInt(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

async function safeRpcBool(name: string): Promise<boolean> {
  try {
    const r = await supabase.rpc(name as any);
    if (r.error) return false;
    return r.data === true;
  } catch {
    return false;
  }
}

export function StateAchievementsWidget({ stateCode }: { stateCode: string }) {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [types, setTypes] = useState<AnyRow[]>([]);
  const [options, setOptions] = useState<AnyRow[]>([]);
  const [requests, setRequests] = useState<AnyRow[]>([]);

  const [canViewAll, setCanViewAll] = useState(false);

  const optionById = useMemo(() => {
    const m: Record<string, AnyRow> = {};
    for (const o of options) if (o?.id) m[String(o.id)] = o;
    return m;
  }, [options]);

  const governorType = useMemo(() => (types || []).find((t) => normLower(t.name) === "governor rotations") || null, [types]);
  const swpType = useMemo(() => (types || []).find((t) => normLower(t.name) === "swp weapon") || null, [types]);

  async function loadAll() {
    setLoading(true);
    setMsg(null);

    const a = await safeRpcBool("is_app_admin");
    const o = await safeRpcBool("is_dashboard_owner");
    setCanViewAll(!!(a || o));

    const t = await supabase
      .from("state_achievement_types")
      .select("*")
      .eq("state_code", stateCode)
      .eq("active", true)
      .order("name", { ascending: true });

    if (t.error) {
      setTypes([]); setOptions([]); setRequests([]);
      setMsg("Types load failed: " + t.error.message);
      setLoading(false);
      return;
    }

    const tData = (t.data as any[]) || [];
    setTypes(tData);

    const ids = tData.map((x) => x?.id).filter(Boolean);
    if (ids.length) {
      const op = await supabase
        .from("state_achievement_options")
        .select("*")
        .in("achievement_type_id", ids)
        .eq("active", true)
        .order("sort", { ascending: true })
        .order("label", { ascending: true });
      if (!op.error) setOptions((op.data as any[]) || []);
      else setOptions([]);
    } else {
      setOptions([]);
    }

    // This select may be blocked by RLS for non-admins; show friendly message if so.
    const r = await supabase
      .from("state_achievement_requests")
      .select("*")
      .eq("state_code", stateCode)
      .order("created_at", { ascending: false })
      .limit(1200);

    if (r.error) {
      setRequests([]);
      setMsg("Requests view blocked (RLS): " + r.error.message);
      setLoading(false);
      return;
    }

    setRequests((r.data as any[]) || []);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, [stateCode]);

  const govRows = useMemo(() => {
    if (!governorType?.id) return [];
    const tid = String(governorType.id);
    const req = Math.max(1, asInt(governorType.required_count, 3));

    const byPlayer: Record<string, AnyRow> = {};
    for (const r of requests) {
      if (String(r.achievement_type_id) !== tid) continue;
      const name = String(r.player_name || "").trim();
      if (!name) continue;
      const cur = Math.max(0, asInt(r.current_count, 0));
      const prev = byPlayer[name];
      if (!prev || cur > Math.max(0, asInt(prev.current_count, 0))) byPlayer[name] = r;
    }

    const out = Object.keys(byPlayer).map((k) => {
      const r = byPlayer[k];
      const cur = Math.max(0, asInt(r.current_count, 0));
      const done = cur >= req || String(r.status || "") === "completed";
      return { player: String(r.player_name || k), alliance: String(r.alliance_name || ""), cur, req, done };
    });

    out.sort((a, b) => (b.cur - a.cur) || a.player.localeCompare(b.player));
    return out.slice(0, 10);
  }, [requests, governorType]);

  const swpRows = useMemo(() => {
    if (!swpType?.id) return [];
    const tid = String(swpType.id);

    const seen: Record<string, boolean> = {};
    const out: AnyRow[] = [];
    for (const r of requests) {
      if (String(r.achievement_type_id) !== tid) continue;
      const name = String(r.player_name || "").trim();
      if (!name || seen[name]) continue;
      seen[name] = true;
      const weapon = r.option_id ? String(optionById[String(r.option_id)]?.label || "") : "";
      out.push({ player: String(r.player_name || name), alliance: String(r.alliance_name || ""), weapon: weapon || "(none)" });
      if (out.length >= 8) break;
    }
    return out;
  }, [requests, swpType, optionById]);

  return (
    <div className="zombie-card" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 900 }}>🏆 Achievements</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={() => window.location.assign("/state/789/achievements-form")}>Submit Form</button>
          <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={() => window.location.assign("/state/789/achievements-progress")}>Progress</button>
          <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={() => window.location.assign("/state/789/achievements-tracker")}>Tracker</button>
          <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={loadAll}>Refresh</button>
        </div>
      </div>

      <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
        {loading ? "Loading…" : `types=${types.length} • requests=${requests.length} • view_all=${String(canViewAll)}`}
      </div>

      {msg ? <div style={{ marginTop: 10, opacity: 0.9 }}>{msg}</div> : null}

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(280px, 1fr)", gap: 12 }}>
        <div style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
          <div style={{ fontWeight: 900 }}>👑 Governor Rotations</div>
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
            {governorType ? `Top progress toward ${String(governorType.required_count ?? 3)}.` : "Type not created yet."}
          </div>
          <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
            {govRows.map((r) => (
              <div key={r.player} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>{r.player}</div>
                <div style={{ opacity: 0.7 }}>{r.alliance ? `(${r.alliance})` : ""}</div>
                <div style={{ marginLeft: "auto", fontWeight: 900 }}>{r.cur}/{r.req}{r.done ? " ✅" : ""}</div>
              </div>
            ))}
            {!loading && govRows.length === 0 ? <div style={{ opacity: 0.75 }}>No data (or blocked).</div> : null}
          </div>
        </div>

        <div style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
          <div style={{ fontWeight: 900 }}>🔫 SWP Weapons</div>
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
            {swpType ? "Recent requests (one per player)." : "Type not created yet."}
          </div>
          <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
            {swpRows.map((r) => (
              <div key={r.player} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>{r.player}</div>
                <div style={{ opacity: 0.7 }}>{r.alliance ? `(${r.alliance})` : ""}</div>
                <div style={{ marginLeft: "auto", fontWeight: 900 }}>{r.weapon}</div>
              </div>
            ))}
            {!loading && swpRows.length === 0 ? <div style={{ opacity: 0.75 }}>No data (or blocked).</div> : null}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>
        If requests show “blocked (RLS)”, ask Owner to grant you view/edit in Owner → State Achievements Admin → Access.
      </div>
    </div>
  );
}
