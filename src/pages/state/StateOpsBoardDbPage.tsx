import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";
import UserIdDisplay from "../../components/common/UserIdDisplay";

type Row = any;
type PlayerOpt = { user_id: string; display_name: string; player_id: string };

export default function StateOpsBoardDbPage() {
  const { state_code } = useParams();
  const stateCode = String(state_code || "789");

  const [rows, setRows] = useState<Row[]>([]);
  const [players, setPlayers] = useState<PlayerOpt[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [status, setStatus] = useState("");

  const [title, setTitle] = useState("");
  const [assigned, setAssigned] = useState("");
  const [due, setDue] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    setStatus("Loading…");

    try {
      const rpc = await supabase.rpc("can_manage_state_ops", { p_state_code: stateCode });
      if (!rpc.error) setCanManage(!!rpc.data);
    } catch {}

    const p = await supabase.from("v_approved_players").select("user_id,display_name,player_id").order("display_name", { ascending: true });
    if (!p.error) setPlayers((p.data ?? []) as any);

    const r = await supabase.from("state_ops_items").select("*").eq("state_code", stateCode).order("created_at", { ascending: false });
    if (r.error) { setStatus(r.error.message); setRows([]); return; }

    setRows(r.data ?? []);
    setStatus("");
  }

  useEffect(() => { void load(); }, [stateCode]);

  async function add() {
    if (!canManage) return alert("No permission.");
    if (!title.trim()) return;

    const ins = await supabase.from("state_ops_items").insert({
      state_code: stateCode,
      title: title.trim(),
      status: "todo",
      assigned_user_id: assigned || null,
      due_at: due ? new Date(due).toISOString() : null,
      notes: notes || null
    });
    if (ins.error) return alert(ins.error.message);

    setTitle(""); setAssigned(""); setDue(""); setNotes("");
    await load();
  }

  async function setItem(id: string, patch: any) {
    if (!canManage) return;
    const up = await supabase.from("state_ops_items").update(patch).eq("id", id);
    if (up.error) alert(up.error.message);
    await load();
  }

  const header = useMemo(() => `🗺️ State ${stateCode} Ops Board`, [stateCode]);

  return (
    <div style={{ padding: 16, maxWidth: 1300, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>{header}</h2>
        <SupportBundleButton />
      </div>
      <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>{status || (canManage ? "Manager mode" : "View mode")}</div>

      {canManage ? (
        <div className="zombie-card" style={{ marginTop: 12, padding: 12, borderRadius: 16 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New ops item title" />
            <select value={assigned} onChange={(e) => setAssigned(e.target.value)}>
              <option value="">Assign to… (optional)</option>
              {players.map(p => <option key={p.user_id} value={p.user_id}>{p.display_name}</option>)}
            </select>
            <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => void add()}>Add</button>
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {rows.map((r: any) => (
          <div key={r.id} className="zombie-card" style={{ padding: 12, borderRadius: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 950 }}>{r.title}</div>
              {canManage ? (
                <select value={r.status} onChange={(e) => void setItem(r.id, { status: e.target.value })}>
                  <option value="todo">todo</option>
                  <option value="doing">doing</option>
                  <option value="done">done</option>
                </select>
              ) : <div style={{ opacity: 0.8 }}>{r.status}</div>}
            </div>

            <div style={{ marginTop: 8, opacity: 0.85, fontSize: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div><b>Assigned:</b> {r.assigned_user_id ? <UserIdDisplay userId={r.assigned_user_id} /> : "—"}</div>
              <div><b>Due:</b> {r.due_at ? new Date(r.due_at).toLocaleString() : "—"}</div>
            </div>

            {r.notes ? <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{String(r.notes)}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
