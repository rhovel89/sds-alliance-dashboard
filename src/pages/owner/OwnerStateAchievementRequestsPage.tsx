import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type RequestRow = {
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
  notes: string | null;
  created_at: string | null;
  updated_at?: string | null;
};

type TypeLite = { id: string; name: string; required_count: number | null; requires_option: boolean | null };
type OptLite = { id: string; label: string };

const STATE = "789";
function norm(s: any) { return String(s || "").trim(); }
function nowIso() { return new Date().toISOString(); }

export default function OwnerStateAchievementRequestsPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [types, setTypes] = useState<TypeLite[]>([]);
  const [opts, setOpts] = useState<Record<string, OptLite>>({});

  const [rows, setRows] = useState<RequestRow[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  async function loadTypes() {
    try {
      const { data, error } = await supabase
        .from("state_achievement_types")
        .select("id,name,required_count,requires_option")
        .eq("state_code", STATE)
        .order("name", { ascending: true });
      if (error) throw new Error(error.message);
      setTypes((data || []) as any);
    } catch {
      setTypes([]);
    }
  }

  async function loadOptionsIndex() {
    try {
      const { data, error } = await supabase
        .from("state_achievement_options")
        .select("id,label")
        .eq("state_code", STATE);
      if (error) throw new Error(error.message);
      const map: Record<string, OptLite> = {};
      for (const o of (data || []) as any[]) map[o.id] = { id: o.id, label: o.label };
      setOpts(map);
    } catch {
      setOpts({});
    }
  }

  async function loadRequests() {
    setErr(null);
    setLoading(true);
    try {
      const cols = "id,state_code,player_name,alliance_name,achievement_type_id,option_id,status,current_count,required_count,completed_at,notes,created_at,updated_at";
      const { data, error } = await supabase
        .from("state_achievement_requests")
        .select(cols)
        .eq("state_code", STATE)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      setRows((data || []) as RequestRow[]);
    } catch (e: any) {
      setErr("Load failed: " + (e?.message || String(e)));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTypes(); loadOptionsIndex(); loadRequests(); }, []);

  const typeName = useMemo(() => {
    const map: Record<string, TypeLite> = {};
    for (const t of types) map[t.id] = t;
    return map;
  }, [types]);

  const filtered = useMemo(() => {
    const s = norm(q).toLowerCase();
    return (rows || []).filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (!s) return true;
      const tn = typeName[r.achievement_type_id]?.name || "";
      const on = r.option_id ? (opts[r.option_id]?.label || "") : "";
      return (
        (r.player_name || "").toLowerCase().includes(s) ||
        (r.alliance_name || "").toLowerCase().includes(s) ||
        tn.toLowerCase().includes(s) ||
        on.toLowerCase().includes(s) ||
        (r.id || "").toLowerCase().includes(s)
      );
    });
  }, [rows, q, statusFilter, typeName, opts]);

  function pct(cur: number | null, req: number | null) {
    const c = Number(cur ?? 0);
    const r = Math.max(1, Number(req ?? 1));
    return `${Math.min(c, r)}/${r}`;
  }

  async function patch(id: string, patch: Partial<RequestRow>) {
    setErr(null);
    setLoading(true);
    try {
      const upd = await supabase
        .from("state_achievement_requests")
        .update({ ...patch, updated_at: nowIso() } as any)
        .eq("id", id);
      if (upd.error) throw new Error(upd.error.message);
      await loadRequests();
    } catch (e: any) {
      setErr("Update failed: " + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  async function addOne(r: RequestRow) {
    const cur = Number(r.current_count ?? 0) + 1;
    const req = Math.max(1, Number(r.required_count ?? typeName[r.achievement_type_id]?.required_count ?? 1));
    const completed = cur >= req;
    await patch(r.id, {
      current_count: cur,
      required_count: req,
      status: completed ? "completed" : (r.status || "pending"),
      completed_at: completed ? (r.completed_at || nowIso()) : null,
    } as any);
  }

  async function markCompleted(r: RequestRow) {
    const req = Math.max(1, Number(r.required_count ?? typeName[r.achievement_type_id]?.required_count ?? 1));
    await patch(r.id, {
      status: "completed",
      current_count: req,
      required_count: req,
      completed_at: nowIso(),
    } as any);
  }

  async function exportJson() {
    const payload = { exportedAtUtc: nowIso(), state: STATE, requests: rows };
    const txt = JSON.stringify(payload, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied export JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  return (
    <div style={{ padding: 14 }}>
      <h2 style={{ margin: 0 }}>🏆 Owner — State 789 Achievement Requests</h2>

      {err ? (
        <div className="zombie-card" style={{ marginTop: 12, border: "1px solid rgba(255,120,120,0.35)" }}>
          <div style={{ fontWeight: 900, color: "#ffb3b3" }}>Error</div>
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap", opacity: 0.9 }}>{err}</div>
        </div>
      ) : null}

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input className="zombie-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search player/alliance/type/option/id…" style={{ padding: "10px 12px", flex: 1, minWidth: 260 }} />
          <select className="zombie-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: "10px 12px" }}>
            <option value="">All statuses</option>
            <option value="pending">pending</option>
            <option value="in_progress">in_progress</option>
            <option value="completed">completed</option>
            <option value="denied">denied</option>
          </select>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={loadRequests} disabled={loading}>Reload</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={exportJson}>Export</button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {filtered.map((r) => {
          const t = typeName[r.achievement_type_id];
          const opt = r.option_id ? (opts[r.option_id]?.label || "(unknown option)") : null;
          const reqDefault = Math.max(1, Number(t?.required_count ?? 1));
          const req = Math.max(1, Number(r.required_count ?? reqDefault));
          const cur = Number(r.current_count ?? 0);

          return (
            <div key={r.id} className="zombie-card">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>{r.player_name}</div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>({r.alliance_name})</div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>• {t?.name || r.achievement_type_id}</div>
                {opt ? <div style={{ opacity: 0.75, fontSize: 12 }}>• {opt}</div> : null}
                <div style={{ marginLeft: "auto", opacity: 0.8, fontSize: 12 }}>{pct(cur, req)}</div>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ opacity: 0.75, fontSize: 12 }}>Status</div>
                <select className="zombie-input" value={r.status || "pending"} onChange={(e) => patch(r.id, { status: e.target.value } as any)} style={{ padding: "8px 10px" }}>
                  <option value="pending">pending</option>
                  <option value="in_progress">in_progress</option>
                  <option value="completed">completed</option>
                  <option value="denied">denied</option>
                </select>

                <div style={{ opacity: 0.75, fontSize: 12 }}>Progress</div>
                <input
                  className="zombie-input"
                  type="number"
                  value={cur}
                  onChange={(e) => patch(r.id, { current_count: Number(e.target.value || 0) } as any)}
                  style={{ padding: "8px 10px", width: 110 }}
                />
                <div style={{ opacity: 0.75, fontSize: 12 }}>/</div>
                <input
                  className="zombie-input"
                  type="number"
                  value={req}
                  onChange={(e) => patch(r.id, { required_count: Math.max(1, Number(e.target.value || 1)) } as any)}
                  style={{ padding: "8px 10px", width: 110 }}
                />

                <button className="zombie-btn" style={{ padding: "8px 10px" }} onClick={() => addOne(r)} disabled={loading}>+1</button>
                <button className="zombie-btn" style={{ padding: "8px 10px" }} onClick={() => markCompleted(r)} disabled={loading}>Complete</button>

                <div style={{ marginLeft: "auto", opacity: 0.65, fontSize: 12 }}>
                  {r.completed_at ? ("completed: " + r.completed_at) : ""}
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Notes</div>
                <textarea
                  className="zombie-input"
                  defaultValue={r.notes || ""}
                  onBlur={(e) => {
                    const v = e.target.value;
                    if ((v || "") !== (r.notes || "")) patch(r.id, { notes: v } as any);
                  }}
                  style={{ width: "100%", minHeight: 70, padding: "10px 12px" }}
                />
              </div>

              <div style={{ marginTop: 8, opacity: 0.6, fontSize: 12 }}>
                id: {r.id} • created: {r.created_at || nowIso()}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 ? <div style={{ opacity: 0.75 }}>No requests found.</div> : null}
      </div>
    </div>
  );
}