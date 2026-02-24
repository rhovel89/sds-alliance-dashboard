import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";

type Row = {
  id: string;
  created_at: string;
  created_by_user_id: string;
  state_code: string | null;
  alliance_code: string | null;
  channel_id: string | null;
  message: string;
  payload: any;
  status: "pending" | "sent" | "failed" | "canceled";
  error: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
};

async function copyToClipboard(text: string) {
  try { await navigator.clipboard.writeText(text); alert("Copied"); } catch { alert("Copy failed"); }
}

export default function OwnerDiscordQueuePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");

  const [filter, setFilter] = useState<"" | Row["status"]>("");
  const [stateCode, setStateCode] = useState("789");
  const [channelId, setChannelId] = useState("");
  const [message, setMessage] = useState("");
  const [payloadText, setPayloadText] = useState("{}");

  async function load() {
    setStatus("Loading…");
    const res = await supabase.from("v_discord_outbox").select("*").limit(200);
    if (res.error) { setStatus(res.error.message); return; }
    setRows((res.data ?? []) as any);
    setStatus("");
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => (filter ? r.status === filter : true));
  }, [rows, filter]);

  async function queue() {
    setStatus("Queueing…");
    let obj: any = {};
    try { obj = JSON.parse(payloadText); } catch (e: any) { setStatus("Invalid JSON: " + String(e?.message ?? e)); return; }

    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id ?? "";
    if (!uid) return setStatus("Not signed in.");

    const ins = await supabase.from("discord_outbox").insert({
      created_by_user_id: uid,
      state_code: stateCode.trim() || null,
      channel_id: channelId.trim() || null,
      message: message.trim(),
      payload: obj,
      status: "pending",
    });

    if (ins.error) { setStatus(ins.error.message); return; }
    setMessage("");
    setPayloadText("{}");
    await load();
    setStatus("Queued ✅");
    window.setTimeout(() => setStatus(""), 1200);
  }

  async function setRowStatus(r: Row, next: Row["status"]) {
    setStatus("Updating…");
    const up: any = { status: next };
    if (next === "sent") up.sent_at = new Date().toISOString();
    const res = await supabase.from("discord_outbox").update(up).eq("id", r.id);
    if (res.error) { setStatus(res.error.message); return; }
    await load();
    setStatus("");
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>Discord Queue (Outbox)</h1>
      <div style={{ opacity: 0.8, marginTop: 6 }}>{status ? status : "Queue payloads for bot to send later."}</div>

      <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden", marginTop: 12 }}>
        <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>Queue New</div>
        <div style={{ padding: 12, display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ opacity: 0.7, fontSize: 12 }}>State</div>
              <input value={stateCode} onChange={(e) => setStateCode(e.target.value)} />
            </div>
            <div>
              <div style={{ opacity: 0.7, fontSize: 12 }}>Channel ID (optional)</div>
              <input value={channelId} onChange={(e) => setChannelId(e.target.value)} />
            </div>
          </div>

          <div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>Message (optional helper)</div>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
          </div>

          <div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>Payload JSON</div>
            <textarea value={payloadText} onChange={(e) => setPayloadText(e.target.value)} rows={8} style={{ fontFamily: "ui-monospace, Menlo, monospace" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={queue}>Queue</button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
        <button onClick={load}>Reload</button>
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
          <option value="">(all)</option>
          <option value="pending">pending</option>
          <option value="sent">sent</option>
          <option value="failed">failed</option>
          <option value="canceled">canceled</option>
        </select>
        <div style={{ opacity: 0.75 }}>Showing {filtered.length}</div>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      <div style={{ display: "grid", gap: 12 }}>
        {filtered.map((r) => (
          <div key={r.id} style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: 12, borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900 }}>[{r.status}] {r.channel_id ? `#${r.channel_id}` : "(no channel)"}</div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>
                  {new Date(r.created_at).toLocaleString()} • state {r.state_code ?? "?"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => copyToClipboard(JSON.stringify(r.payload ?? {}, null, 2))}>Copy Payload</button>
                <button onClick={() => setRowStatus(r, "sent")}>Mark Sent</button>
                <button onClick={() => setRowStatus(r, "canceled")}>Cancel</button>
              </div>
            </div>

            {r.message ? <div style={{ padding: 12, whiteSpace: "pre-wrap" }}>{r.message}</div> : null}

            <details style={{ padding: 12 }}>
              <summary style={{ cursor: "pointer" }}>Raw</summary>
              <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 12, opacity: 0.9 }}>
{JSON.stringify(r, null, 2)}
              </pre>
            </details>
          </div>
        ))}
        {filtered.length === 0 ? <div style={{ opacity: 0.7 }}>No rows.</div> : null}
      </div>
    </div>
  );
}
