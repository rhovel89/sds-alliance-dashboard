import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type TypeRow = {
  id: string;
  state_code: string;
  name: string;
  requires_option: boolean | null;
  required_count: number | null;
  active: boolean | null;
};

type OptRow = {
  id: string;
  state_code: string;
  achievement_type_id: string;
  label: string;
  active: boolean | null;
};

type ReqRow = {
  id: string;
  state_code: string;
  player_name: string;
  alliance_name: string;
  achievement_type_id: string;
  option_id: string | null;
  status: string;
  current_count: number | null;
  required_count: number | null;
  completed_at: string | null;
  created_at: string | null;
};

const STATE = "789";

function norm(s: any) { return String(s || "").trim(); }
function lower(s: any) { return norm(s).toLowerCase(); }
function nowIso() { return new Date().toISOString(); }

function pct(cur: number | null, req: number | null) {
  const c = Number(cur ?? 0);
  const r = Math.max(1, Number(req ?? 1));
  return `${Math.min(c, r)}/${r}`;
}
function pctNum(cur: number | null, req: number | null) {
  const c = Number(cur ?? 0);
  const r = Math.max(1, Number(req ?? 1));
  return Math.min(1, c / r);
}

export default function State789AchievementProgressPage() {
  const [types, setTypes] = useState<TypeRow[]>([]);
  const [opts, setOpts] = useState<Record<string, OptRow>>({});
  const [reqs, setReqs] = useState<ReqRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const typeMap = useMemo(() => {
    const m: Record<string, TypeRow> = {};
    for (const t of types) m[t.id] = t;
    return m;
  }, [types]);

  async function loadAll() {
    setErr(null);
    setLoading(true);
    try {
      const tRes = await supabase
        .from("state_achievement_types")
        .select("id,state_code,name,requires_option,required_count,active")
        .eq("state_code", STATE)
        .order("name", { ascending: true });

      if (tRes.error) throw new Error("Types load failed: " + tRes.error.message);
      setTypes((tRes.data || []) as TypeRow[]);

      const oRes = await supabase
        .from("state_achievement_options")
        .select("id,state_code,achievement_type_id,label,active")
        .eq("state_code", STATE)
        .order("label", { ascending: true });

      if (oRes.error) throw new Error("Options load failed: " + oRes.error.message);
      const om: Record<string, OptRow> = {};
      for (const o of (oRes.data || []) as OptRow[]) om[o.id] = o;
      setOpts(om);

      const cols = "id,state_code,player_name,alliance_name,achievement_type_id,option_id,status,current_count,required_count,completed_at,created_at";
      const rRes = await supabase
        .from("state_achievement_requests")
        .select(cols)
        .eq("state_code", STATE)
        .order("created_at", { ascending: false });

      if (rRes.error) throw new Error("Requests load failed: " + rRes.error.message);
      setReqs((rRes.data || []) as ReqRow[]);
    } catch (e: any) {
      setErr(e?.message || String(e));
      setReqs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  const filtered = useMemo(() => {
    const s = lower(q);
    return (reqs || []).filter((r) => {
      if (typeFilter && r.achievement_type_id !== typeFilter) return false;
      if (statusFilter && (r.status || "") !== statusFilter) return false;
      if (!s) return true;
      const t = typeMap[r.achievement_type_id]?.name || r.achievement_type_id;
      const o = r.option_id ? (opts[r.option_id]?.label || "") : "";
      return (
        lower(r.player_name).includes(s) ||
        lower(r.alliance_name).includes(s) ||
        lower(t).includes(s) ||
        lower(o).includes(s) ||
        lower(r.status).includes(s)
      );
    });
  }, [reqs, q, typeFilter, statusFilter, typeMap, opts]);

  // GROUP: player + type + option (option matters for SWP weapon)
  const groups = useMemo(() => {
    type Group = {
      key: string;
      player: string;
      alliance: string;
      typeId: string;
      typeName: string;
      optionId: string | null;
      optionLabel: string | null;
      status: string;
      cur: number;
      req: number;
      completedAt: string | null;
      createdAt: string | null;
    };

    const m = new Map<string, Group>();
    for (const r of filtered) {
      const typeName = typeMap[r.achievement_type_id]?.name || r.achievement_type_id;
      const optLabel = r.option_id ? (opts[r.option_id]?.label || "(unknown option)") : null;
      const key = `${lower(r.player_name)}|${r.achievement_type_id}|${r.option_id || ""}`;

      const cur = Number(r.current_count ?? 0);
      const req = Math.max(1, Number(r.required_count ?? typeMap[r.achievement_type_id]?.required_count ?? 1));

      // Keep newest row if duplicates (same key)
      const existing = m.get(key);
      if (!existing) {
        m.set(key, {
          key,
          player: r.player_name,
          alliance: r.alliance_name,
          typeId: r.achievement_type_id,
          typeName,
          optionId: r.option_id,
          optionLabel: optLabel,
          status: r.status || "pending",
          cur,
          req,
          completedAt: r.completed_at || null,
          createdAt: r.created_at || null,
        });
      } else {
        const existingTime = existing.createdAt ? Date.parse(existing.createdAt) : 0;
        const newTime = r.created_at ? Date.parse(r.created_at) : 0;
        if (newTime >= existingTime) {
          existing.status = r.status || existing.status;
          existing.cur = cur;
          existing.req = req;
          existing.completedAt = r.completed_at || existing.completedAt;
          existing.createdAt = r.created_at || existing.createdAt;
          existing.alliance = r.alliance_name || existing.alliance;
          existing.optionLabel = optLabel;
        }
      }
    }

    return Array.from(m.values()).sort((a, b) => {
      const pa = pctNum(a.cur, a.req);
      const pb = pctNum(b.cur, b.req);
      if (pb !== pa) return pb - pa;
      return lower(a.player).localeCompare(lower(b.player));
    });
  }, [filtered, typeMap, opts]);

  async function copyExport() {
    const payload = {
      exportedAtUtc: nowIso(),
      state: STATE,
      groups,
    };
    const txt = JSON.stringify(payload, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied progress export JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>📊 State 789 — Achievements Progress</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={loadAll} disabled={loading}>Reload</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={copyExport}>Export</button>
        </div>
      </div>

      {err ? (
        <div className="zombie-card" style={{ marginTop: 12, border: "1px solid rgba(255,120,120,0.35)" }}>
          <div style={{ fontWeight: 900, color: "#ffb3b3" }}>Error</div>
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap", opacity: 0.9 }}>{err}</div>
        </div>
      ) : null}

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input className="zombie-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search player/alliance/type/weapon/status…" style={{ padding: "10px 12px", flex: 1, minWidth: 260 }} />

          <select className="zombie-input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: "10px 12px", minWidth: 240 }}>
            <option value="">All achievements</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          <select className="zombie-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: "10px 12px" }}>
            <option value="">All statuses</option>
            <option value="pending">pending</option>
            <option value="in_progress">in_progress</option>
            <option value="completed">completed</option>
            <option value="denied">denied</option>
          </select>

          <div style={{ opacity: 0.7, fontSize: 12 }}>
            Showing: {groups.length}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {groups.map((g) => {
          const bar = Math.round(pctNum(g.cur, g.req) * 100);
          return (
            <div key={g.key} className="zombie-card">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>{g.player}</div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>({g.alliance})</div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>• {g.typeName}</div>
                {g.optionLabel ? <div style={{ opacity: 0.75, fontSize: 12 }}>• {g.optionLabel}</div> : null}
                <div style={{ marginLeft: "auto", opacity: 0.9, fontSize: 12 }}>
                  {pct(g.cur, g.req)} • {bar}%
                </div>
              </div>

              <div style={{ marginTop: 10, height: 10, borderRadius: 10, background: "rgba(255,255,255,0.10)", overflow: "hidden" }}>
                <div style={{ width: `${bar}%`, height: "100%", background: "rgba(120,255,120,0.30)" }} />
              </div>

              <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap", opacity: 0.7, fontSize: 12 }}>
                <div>Status: {g.status}</div>
                {g.completedAt ? <div>Completed: {g.completedAt}</div> : null}
                {g.createdAt ? <div>Created: {g.createdAt}</div> : null}
              </div>
            </div>
          );
        })}
        {groups.length === 0 ? <div style={{ opacity: 0.75 }}>No progress to show.</div> : null}
      </div>
    </div>
  );
}