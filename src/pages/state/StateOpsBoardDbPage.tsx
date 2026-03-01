import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";
import UserIdDisplay from "../../components/common/UserIdDisplay";
import { supabase } from "../../lib/supabaseBrowserClient";
import StateDiscordChannelSelect from "../../components/discord/StateDiscordChannelSelect";
import StateDiscordChannelsManagerPanel from "../../components/state/StateDiscordChannelsManagerPanel";

type Row = any;
type PlayerOpt = { user_id: string; display_name: string; player_id: string };

function loadDiscordDefaults(): { channelName: string | null; rolesCsv: string | null } {
  try {
    const raw = localStorage.getItem("sad_discord_defaults_v1");
    if (!raw) return { channelName: null, rolesCsv: null };
    const s = JSON.parse(raw);
    if (!s || s.version !== 1) return { channelName: null, rolesCsv: null };
    const g = s.global || {};
    return {
      channelName: g.channelName ? String(g.channelName) : null,
      rolesCsv: g.rolesCsv ? String(g.rolesCsv) : null,
    };
  } catch {
    return { channelName: null, rolesCsv: null };
  }
}

export default function StateOpsBoardDbPage() {

  // --- Ops → Discord ---
  const [opsDiscordChannelId, setOpsDiscordChannelId] = useState<string>("");
  const [opsPing, setOpsPing] = useState<string>("");

  async function queueOpsToDiscord(message: string) {
    const msg = String(message || "").trim();
    if (!msg) return alert("Nothing to send.");

    const q = await supabase.rpc("queue_discord_send" as any, {
      p_state_code: "789",
      p_alliance_code: "",
      p_kind: "state_ops",
      p_channel_id: String(opsDiscordChannelId || "").trim(),
      p_message: msg,
    } as any);

    if ((q as any)?.error) {
      alert("Discord queue failed: " + (q as any).error.message);
    } else {
      alert("Queued to Discord ✅");
    }
  }

  function buildOpsSummary(): string {
    const url = window.location.origin + "/state/789/ops-db";
    return "🛰️ **State 789 Ops Board**\\n" + url;
  }

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

    // Permissions check
    try {
      const rpc = await supabase.rpc("can_manage_state_ops", { p_state_code: stateCode });
      if (!rpc.error) setCanManage(!!rpc.data);
    } catch {}

    // Players list for assigning
    const p = await supabase
      .from("v_approved_players")
      .select("user_id,display_name,player_id")
      .order("display_name", { ascending: true });

    if (!p.error) setPlayers((p.data ?? []) as any);

    // Items
    const r = await supabase
      .from("state_ops_items")
      .select("*")
      .eq("state_code", stateCode)
      .order("created_at", { ascending: false });

    if (r.error) { setStatus(r.error.message); setRows([]); return; }
    setRows(r.data ?? []);
    setStatus("");
  }

  useEffect(() => { void load(); }, [stateCode]);

  useEffect(() => {
    const ch = supabase
      .channel(`rt_state_ops_${stateCode}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "state_ops_items", filter: `state_code=eq.${stateCode}` },
        () => {
          // debounce reload slightly to avoid rapid bursts
          window.clearTimeout((window as any).__rt_ops_t);
          (window as any).__rt_ops_t = window.setTimeout(() => { void load(); }, 250);
        }
      )
      .subscribe();

    return () => {
      try { supabase.removeChannel(ch); } catch {}
    };
  }, [stateCode]);

  function buildSummary(): string {
    const items = rows || [];
    const todo = items.filter((x: any) => x.status === "todo");
    const doing = items.filter((x: any) => x.status === "doing");
    const done = items.filter((x: any) => x.status === "done");

    const lines: string[] = [];
    lines.push(`🗺️ State ${stateCode} Ops Summary`);
    lines.push(`✅ done: ${done.length} • 🔥 doing: ${doing.length} • ⬜ todo: ${todo.length}`);
    lines.push("");

    const top = [...doing, ...todo].slice(0, 12);
    for (const x of top) lines.push(`• [${x.status}] ${String(x.title || "").trim()}`);
    return lines.join("\n");
  }

  async function queueSummary() {
    if (!canManage) return alert("You do not have permission to queue ops summaries (owner/admin or ops manager).");

    const msg = buildSummary();
    const d = loadDiscordDefaults();

    const payload = {
      kind: "state_ops_summary",
      state_code: stateCode,
      channel_name: d.channelName,
      roles_csv: d.rolesCsv,
      message: msg,
      created_at_utc: new Date().toISOString(),
    };

    const ins = await supabase.from("discord_send_queue").insert({
      state_code: stateCode,
      alliance_code: null,
      channel_name: d.channelName,
      roles_csv: d.rolesCsv,
      message: msg,
      payload,
      status: "queued",
    });

    if (ins.error) {
      try { await navigator.clipboard.writeText(JSON.stringify(payload, null, 2)); } catch {}
      return alert("Queue insert failed — payload copied.\n" + ins.error.message);
    }

    try { await navigator.clipboard.writeText(msg); } catch {}
    alert("Queued ✅ (and message copied)");
  }

  async function add() {
    if (!canManage) return alert("No permission to manage ops.");
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
        <div>
          <h2 style={{ margin: 0 }}>{header}</h2>
          <div style={{ marginTop: 6, opacity: 0.85, fontSize: 12 }}>
            {status || (canManage ? "Manager mode (add/edit + queue summary)" : "View mode")}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
            <button type="button" onClick={() => void queueSummary()} disabled={!canManage}>
              📥 Queue Summary to Discord
            </button>
            <a href="/owner/discord-queue-db" style={{ opacity: 0.9, fontSize: 12 }}>View Queue</a>
            {!canManage ? (
              <span style={{ opacity: 0.75, fontSize: 12 }}>
                (Disabled: need owner/admin or ops manager)
              </span>
            ) : null}
          </div>
        </div>

        <SupportBundleButton />
      </div>

      {canManage ? (
        <div className="zombie-card" style={{ marginTop: 12, padding: 12, borderRadius: 16 }}>
          <div style={{ fontWeight: 950 }}>Create Ops Item</div>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
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
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
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
              <div><b>Created:</b> {r.created_by ? <UserIdDisplay userId={r.created_by} /> : "—"}</div>
            </div>

            {r.notes ? <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{String(r.notes)}</div> : null}
          </div>
        ))}
        {!rows.length && !status ? <div style={{ opacity: 0.8 }}>No ops items yet.</div> : null}
      </div>
    </div>
  );
}





