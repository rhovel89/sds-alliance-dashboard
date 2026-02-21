import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type AnyRow = Record<string, any>;

function normLower(v: any) { return String(v || "").trim().toLowerCase(); }
function asInt(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

export default function State789AchievementsProgressPage() {
  const stateCode = "789";

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [types, setTypes] = useState<AnyRow[]>([]);
  const [options, setOptions] = useState<AnyRow[]>([]);
  const [requests, setRequests] = useState<AnyRow[]>([]);

  const typesById = useMemo(() => {
    const m: Record<string, AnyRow> = {};
    for (const t of types) if (t?.id) m[String(t.id)] = t;
    return m;
  }, [types]);

  const optionById = useMemo(() => {
    const m: Record<string, AnyRow> = {};
    for (const o of options) if (o?.id) m[String(o.id)] = o;
    return m;
  }, [options]);

  const governorType = useMemo(() => {
    return (types || []).find((t) => normLower(t.name) === "governor rotations") || null;
  }, [types]);

  const swpType = useMemo(() => {
    return (types || []).find((t) => normLower(t.name) === "swp weapon") || null;
  }, [types]);

  async function loadAll() {
    setLoading(true);
    setMsg(null);

    const t = await supabase
      .from("state_achievement_types")
      .select("*")
      .eq("state_code", stateCode)
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
        .order("sort", { ascending: true })
        .order("label", { ascending: true });

      if (!op.error) setOptions((op.data as any[]) || []);
      else setOptions([]);
    } else {
      setOptions([]);
    }

    const r = await supabase
      .from("state_achievement_requests")
      .select("*")
      .eq("state_code", stateCode)
      .order("created_at", { ascending: false })
      .limit(1500);

    if (r.error) {
      setRequests([]);
      setMsg("Requests load failed: " + r.error.message);
      setLoading(false);
      return;
    }

    setRequests((r.data as any[]) || []);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  const governorRows = useMemo(() => {
    if (!governorType?.id) return [];
    const tid = String(governorType.id);
    const req = Math.max(1, asInt(governorType.required_count, 3));

    // Pick max current_count per player
    const byPlayer: Record<string, AnyRow> = {};
    for (const r of requests) {
      if (String(r.achievement_type_id) !== tid) continue;
      const name = String(r.player_name || "").trim();
      if (!name) continue;

      const cur = Math.max(0, asInt(r.current_count, 0));
      const prev = byPlayer[name];
      if (!prev || cur > Math.max(0, asInt(prev.current_count, 0))) {
        byPlayer[name] = r;
      }
    }

    const out = Object.keys(byPlayer).map((k) => {
      const r = byPlayer[k];
      const cur = Math.max(0, asInt(r.current_count, 0));
      const done = cur >= req || String(r.status || "") === "completed";
      return {
        player_name: String(r.player_name || k),
        alliance_name: String(r.alliance_name || ""),
        cur,
        req,
        done,
        status: String(r.status || ""),
        updated_at: String(r.updated_at || ""),
        created_at: String(r.created_at || "")
      };
    });

    out.sort((a, b) => (b.cur - a.cur) || a.player_name.localeCompare(b.player_name));
    return out;
  }, [requests, governorType]);

  const swpRows = useMemo(() => {
    if (!swpType?.id) return [];
    const tid = String(swpType.id);

    // Most recent request per player (by created_at order already desc)
    const seen: Record<string, boolean> = {};
    const out: AnyRow[] = [];

    for (const r of requests) {
      if (String(r.achievement_type_id) !== tid) continue;
      const name = String(r.player_name || "").trim();
      if (!name || seen[name]) continue;
      seen[name] = true;

      const optLabel = r.option_id ? String(optionById[String(r.option_id)]?.label || "") : "";
      out.push({
        player_name: String(r.player_name || name),
        alliance_name: String(r.alliance_name || ""),
        weapon: optLabel || "(none)",
        status: String(r.status || ""),
        created_at: String(r.created_at || "")
      });
    }

    return out;
  }, [requests, swpType, optionById]);

  const governorSummary = useMemo(() => {
    const total = governorRows.length;
    const done = governorRows.filter((x) => x.done).length;
    return { total, done };
  }, [governorRows]);

  async function copySummaryJson() {
    const payload = {
      version: 1,
      exportedUtc: new Date().toISOString(),
      state_code: stateCode,
      governor_rotations: {
        required_count: governorType?.required_count ?? 3,
        rows: governorRows
      },
      swp_weapon: {
        rows: swpRows
      }
    };

    const txt = JSON.stringify(payload, null, 2);
    try { await navigator.clipboard.writeText(txt); setMsg("✅ Copied summary JSON."); }
    catch { window.prompt("Copy summary JSON:", txt); }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🏆 State 789 — Achievements Progress</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => window.location.assign("/state/789")}>Back to State</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => window.location.assign("/state/789/achievements")}>Player Form</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => window.location.assign("/state/789/achievements-tracker")}>Tracker</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={loadAll}>Refresh</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={copySummaryJson}>Copy Summary JSON</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        {loading ? (
          <div style={{ opacity: 0.75 }}>Loading…</div>
        ) : (
          <div style={{ opacity: 0.85 }}>
            types={types.length} • options={options.length} • requests={requests.length}
            {governorType ? ` • governor_required=${String(governorType.required_count ?? 3)}` : " • governor=not found"}
            {swpType ? " • swp=found" : " • swp=not found"}
          </div>
        )}
        {msg ? <div style={{ marginTop: 10 }}>{msg}</div> : null}
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>👑 Governor Rotations</div>
        <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
          {governorType ? `Progress toward ${String(governorType.required_count ?? 3)} rotations.` : "Create type 'Governor Rotations' in Owner → State Achievements Admin → Types."}
        </div>

        <div style={{ marginTop: 10, opacity: 0.85 }}>
          Completed: {governorSummary.done}/{governorSummary.total}
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {governorRows.slice(0, 200).map((r) => (
            <div key={r.player_name} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900 }}>{r.player_name}</div>
                <div style={{ opacity: 0.7 }}>{r.alliance_name ? `(${r.alliance_name})` : ""}</div>
                <div style={{ marginLeft: "auto", fontWeight: 900 }}>{r.cur}/{r.req}{r.done ? " ✅" : ""}</div>
              </div>
              <div style={{ opacity: 0.65, fontSize: 12, marginTop: 6 }}>
                status={r.status || "—"} • created={r.created_at || "—"}
              </div>
            </div>
          ))}
          {!loading && governorRows.length === 0 ? <div style={{ opacity: 0.75 }}>No Governor Rotation requests yet.</div> : null}
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>🔫 SWP Weapon Requests</div>
        <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
          {swpType ? "Most recent SWP Weapon request per player (shows weapon option)." : "Create type 'SWP Weapon' (requires option) in Owner → State Achievements Admin → Types."}
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {swpRows.slice(0, 250).map((r) => (
            <div key={r.player_name} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900 }}>{r.player_name}</div>
                <div style={{ opacity: 0.7 }}>{r.alliance_name ? `(${r.alliance_name})` : ""}</div>
                <div style={{ marginLeft: "auto", fontWeight: 900 }}>{r.weapon}</div>
              </div>
              <div style={{ opacity: 0.65, fontSize: 12, marginTop: 6 }}>
                status={r.status || "—"} • created={r.created_at || "—"}
              </div>
            </div>
          ))}
          {!loading && swpRows.length === 0 ? <div style={{ opacity: 0.75 }}>No SWP Weapon requests yet.</div> : null}
        </div>
      </div>
    </div>
  );
}