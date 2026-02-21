import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type Row = {
  id: string;
  state_code: string;
  player_name: string;
  alliance_name: string;
  status: "submitted" | "in_progress" | "completed" | "denied";
  current_count: number;
  required_count: number;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;

  state_achievement_types?: { name: string; kind: string; required_count: number } | null;
  state_achievement_options?: { label: string } | null;
};

function nowUtc() { return new Date().toISOString(); }

export default function OwnerAchievementRequestsPage() {
  const STATE = "789";
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "submitted" | "in_progress" | "completed" | "denied">("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setMsg(null);
    const q = supabase
      .from("state_achievement_requests")
      .select(`
        id,state_code,player_name,alliance_name,status,current_count,required_count,completed_at,notes,created_at,updated_at,
        state_achievement_types(name,kind,required_count),
        state_achievement_options(label)
      `)
      .eq("state_code", STATE)
      .order("created_at", { ascending: false });

    const r = await q;
    if (r.error) { setMsg("Load failed: " + r.error.message); setRows([]); return; }
    setRows((r.data as any) || []);
  }

  useEffect(() => { load(); }, []);

  const view = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  async function patch(id: string, patch: any) {
    setBusyId(id);
    setMsg(null);
    const r = await supabase.from("state_achievement_requests").update({ ...patch, updated_at: nowUtc() } as any).eq("id", id);
    if (r.error) setMsg("Update failed: " + r.error.message);
    await load();
    setBusyId(null);
  }

  function inc(r: Row) {
    const next = (r.current_count || 0) + 1;
    patch(r.id, { current_count: next });
  }
  function dec(r: Row) {
    const next = Math.max(0, (r.current_count || 0) - 1);
    patch(r.id, { current_count: next });
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🧟 Owner — Achievement Requests (State 789)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={load}>Refresh</button>
          <SupportBundleButton />
        </div>
      </div>

      {msg ? (
        <div className="zombie-card" style={{ marginTop: 12, border: "1px solid rgba(255,80,80,0.35)" }}>
          <div style={{ fontWeight: 900 }}>Message</div>
          <div style={{ opacity: 0.85, marginTop: 6 }}>{msg}</div>
        </div>
      ) : null}

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ opacity: 0.75, fontSize: 12 }}>Filter</div>
          <select className="zombie-input" value={filter} onChange={(e) => setFilter(e.target.value as any)} style={{ padding: "10px 12px" }}>
            <option value="all">All</option>
            <option value="submitted">Submitted</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="denied">Denied</option>
          </select>
          <div style={{ marginLeft: "auto", opacity: 0.75, fontSize: 12 }}>
            Showing {view.length} / {rows.length}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {view.map((r) => {
          const t = r.state_achievement_types?.name || "Achievement";
          const kind = String(r.state_achievement_types?.kind || "");
          const opt = r.state_achievement_options?.label ? (" — " + r.state_achievement_options.label) : "";
          const needsCount = r.required_count > 1 || kind === "governor_count";
          const prog = needsCount ? ` (${r.current_count}/${r.required_count})` : "";
          const done = r.status === "completed" ? " ✅" : "";

          return (
            <div key={r.id} className="zombie-card">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>{t}{opt}{prog}{done}</div>
                <div style={{ marginLeft: "auto", opacity: 0.7, fontSize: 12 }}>{r.created_at}</div>
              </div>

              <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>
                Player: <b>{r.player_name}</b> • Alliance: <b>{r.alliance_name}</b>
              </div>

              {r.notes ? <div style={{ marginTop: 8, opacity: 0.75, whiteSpace: "pre-wrap" }}>{r.notes}</div> : null}

              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ opacity: 0.75, fontSize: 12 }}>Status</div>
                <select
                  className="zombie-input"
                  value={r.status}
                  onChange={(e) => patch(r.id, { status: e.target.value })}
                  style={{ padding: "10px 12px" }}
                  disabled={busyId === r.id}
                >
                  <option value="submitted">submitted</option>
                  <option value="in_progress">in_progress</option>
                  <option value="completed">completed</option>
                  <option value="denied">denied</option>
                </select>

                {needsCount ? (
                  <>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>Count</div>
                    <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => dec(r)} disabled={busyId === r.id}>-1</button>
                    <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => inc(r)} disabled={busyId === r.id}>+1</button>
                  </>
                ) : null}

                <button
                  className="zombie-btn"
                  style={{ padding: "10px 12px" }}
                  onClick={() => patch(r.id, { current_count: r.required_count, status: "completed" })}
                  disabled={busyId === r.id}
                >
                  Mark Complete
                </button>
              </div>

              {r.completed_at ? (
                <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>
                  Completed at: {r.completed_at}
                </div>
              ) : null}
            </div>
          );
        })}
        {view.length === 0 ? <div style={{ opacity: 0.75 }}>No items.</div> : null}
      </div>
    </div>
  );
}