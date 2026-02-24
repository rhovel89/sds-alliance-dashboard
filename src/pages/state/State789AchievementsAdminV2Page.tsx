import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";

type Row = {
  id: string;
  created_at: string;
  state_code: string | null;
  requester_user_id: string | null;
  requester_name: string | null;
  type_name: string | null;
  kind: string | null;
  option_name: string | null;
  status: string | null;
  progress_count: number;
  required_count: number;
  note: string | null;
  raw: any;
};

function normStatus(s: string | null) {
  return (s ?? "pending").trim();
}

export default function State789AchievementsAdminV2Page() {
  const stateCode = "789";
  const [userId, setUserId] = useState("");
  const [cols, setCols] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");

  const [showCompleted, setShowCompleted] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const u = await supabase.auth.getUser();
      setUserId(u.data.user?.id ?? "");
    })();
  }, []);

  async function loadColumns() {
    const res = await supabase.rpc("get_table_columns", { p_table: "state_achievement_requests" });
    if (!res.error) setCols((res.data ?? []).map((x: any) => String(x.column_name)));
  }

  async function load() {
    setStatus("Loading…");
    const res = await supabase
      .from("v_state_achievement_queue")
      .select("*")
      .eq("state_code", stateCode)
      .order("created_at", { ascending: false })
      .limit(300);

    if (res.error) { setStatus(res.error.message); return; }
    setRows((res.data ?? []) as any);
    setStatus("");
  }

  useEffect(() => { void loadColumns(); void load(); }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((r) => {
      const completed = (r.required_count > 0 && r.progress_count >= r.required_count) || normStatus(r.status).toLowerCase() === "completed";
      if (!showCompleted && completed) return false;
      if (!qq) return true;
      const hay = `${r.requester_name ?? ""} ${r.type_name ?? ""} ${r.option_name ?? ""} ${r.kind ?? ""} ${r.note ?? ""} ${r.status ?? ""}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [rows, showCompleted, q]);

  async function saveRow(r: Row, patch: Partial<Row>) {
    // Only update columns that exist
    const payload: any = {};
    if (patch.progress_count !== undefined && cols.includes("progress_count")) payload.progress_count = patch.progress_count;
    if (patch.required_count !== undefined && cols.includes("required_count")) payload.required_count = patch.required_count;
    if (patch.status !== undefined && cols.includes("status")) payload.status = patch.status;

    if (Object.keys(payload).length === 0) {
      alert("No updatable columns detected (status/progress_count/required_count).");
      return;
    }

    setStatus("Saving…");
    const up = await supabase.from("state_achievement_requests").update(payload).eq("id", r.id);
    if (up.error) { setStatus(up.error.message); return; }
    await load();
    setStatus("");
  }

  async function quickComplete(r: Row) {
    const needed = Math.max(1, r.required_count || 1);
    const patch: any = { progress_count: needed };
    if (cols.includes("status")) patch.status = "completed";
    await saveRow(r, patch);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>State 789 Achievements Admin (V2)</h1>
      <div style={{ opacity: 0.8, marginTop: 6 }}>
        {userId ? "Signed in ✅" : "Not signed in"} • This page relies on RLS via state achievement access. {status ? " • " + status : ""}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
        <button onClick={load}>Reload</button>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search…" />
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} />
          show completed
        </label>
        <div style={{ opacity: 0.75 }}>Showing {filtered.length}</div>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      <div style={{ display: "grid", gap: 12 }}>
        {filtered.map((r) => (
          <div key={r.id} style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: 12, borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900 }}>
                  {r.type_name ?? "Achievement"}{r.option_name ? ` — ${r.option_name}` : ""} {r.kind ? ` • ${r.kind}` : ""}
                </div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>
                  {new Date(r.created_at).toLocaleString()} • {r.requester_name ?? (r.requester_user_id ? r.requester_user_id.slice(0,8) + "…" : "Unknown")}
                </div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>
                  Status: <b>{normStatus(r.status)}</b> • Progress: <b>{r.progress_count}/{Math.max(0, r.required_count)}</b>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => quickComplete(r)}>Complete</button>
              </div>
            </div>

            <div style={{ padding: 12, display: "grid", gap: 10 }}>
              {r.note ? (
                <div style={{ whiteSpace: "pre-wrap", opacity: 0.9 }}>
                  <b>Note:</b> {r.note}
                </div>
              ) : null}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>Status</div>
                  <select
                    value={normStatus(r.status)}
                    onChange={(e) => saveRow(r, { status: e.target.value })}
                    disabled={!cols.includes("status")}
                  >
                    <option value="pending">pending</option>
                    <option value="approved">approved</option>
                    <option value="rejected">rejected</option>
                    <option value="completed">completed</option>
                  </select>
                </div>

                <div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>Progress count</div>
                  <input
                    type="number"
                    value={String(r.progress_count ?? 0)}
                    onChange={(e) => saveRow(r, { progress_count: Number(e.target.value) })}
                    disabled={!cols.includes("progress_count")}
                  />
                </div>

                <div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>Required count</div>
                  <input
                    type="number"
                    value={String(r.required_count ?? 0)}
                    onChange={(e) => saveRow(r, { required_count: Number(e.target.value) })}
                    disabled={!cols.includes("required_count")}
                  />
                </div>
              </div>

              <details>
                <summary style={{ cursor: "pointer" }}>Raw</summary>
                <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 12, opacity: 0.9 }}>
{JSON.stringify(r.raw, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        ))}
        {filtered.length === 0 ? <div style={{ opacity: 0.75 }}>No requests found (or you don’t have access).</div> : null}
      </div>
    </div>
  );
}
