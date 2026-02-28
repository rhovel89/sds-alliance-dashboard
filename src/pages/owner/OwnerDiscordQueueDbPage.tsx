import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";
import UserIdDisplay from "../../components/common/UserIdDisplay";

type Row = any;

export default function OwnerDiscordQueueDbPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");

  async function load() {
    setStatus("Loading…");
    const r = await supabase.from("discord_send_queue").select("*").order("created_at", { ascending: false }).limit(200);
    if (r.error) { setStatus(r.error.message); setRows([]); return; }
    setRows(r.data ?? []);
    setStatus("");
  }

  useEffect(() => { void load(); }, []);

  async function copyText(t: string) {
    try { await navigator.clipboard.writeText(t); alert("Copied ✅"); } catch { alert("Copy failed."); }
  }

  async function setRow(id: string, patch: any) {
    const r = await supabase.from("discord_send_queue").update(patch).eq("id", id);
    if (r.error) return alert(r.error.message);
    await load();
  }

  return (
    <div style={{ padding: 16, maxWidth: 1300, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>📥 Discord Queue (DB)</h2>
        <SupportBundleButton />
      </div>
      <div style={{ marginTop: 8, opacity: 0.85, fontSize: 12 }}>{status}</div>

      <div style={{ marginTop: 12 }}>
        <button type="button" onClick={() => void load()}>Refresh</button>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {rows.map((r: any) => (
          <div key={r.id} className="zombie-card" style={{ padding: 12, borderRadius: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontWeight: 950 }}>
                {r.status} • {r.state_code ? `State ${r.state_code}` : (r.alliance_code ? r.alliance_code : "—")}
              </div>
              <div style={{ opacity: 0.7, fontSize: 12 }}>{new Date(r.created_at).toLocaleString()}</div>
            </div>

            <div style={{ marginTop: 6, opacity: 0.85, fontSize: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div><b>By:</b> <UserIdDisplay userId={r.created_by} /></div>
              {r.channel_name ? <div><b>Channel:</b> {r.channel_name}</div> : null}
              {r.roles_csv ? <div><b>Roles:</b> {r.roles_csv}</div> : null}
              {r.updated_at ? <div><b>Updated:</b> {new Date(r.updated_at).toLocaleString()}</div> : null}
              {r.updated_by ? <div><b>Updated by:</b> <UserIdDisplay userId={r.updated_by} /></div> : null}
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <label>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Status</div>
                <select value={r.status || "queued"} onChange={(e) => void setRow(r.id, { status: e.target.value })}>
                  <option value="queued">queued</option>
                  <option value="sent">sent</option>
                  <option value="failed">failed</option>
                </select>
              </label>

              <label>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Notes</div>
                <input
                  value={r.status_detail || ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, status_detail: v } : x)));
                  }}
                  placeholder="Optional notes (why failed, where sent, etc.)"
                />
                <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => void setRow(r.id, { status_detail: r.status_detail || "" })}>Save Notes</button>
                </div>
              </label>
            </div>

            <div style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{String(r.message || "")}</div>

            <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" onClick={() => void copyText(String(r.message || ""))}>Copy Message</button>
              <button type="button" onClick={() => void copyText(JSON.stringify(r.payload || {}, null, 2))}>Copy Payload</button>
            </div>
          </div>
        ))}
        {!rows.length && !status ? <div style={{ opacity: 0.8 }}>Queue empty.</div> : null}
      </div>
    </div>
  );
}
