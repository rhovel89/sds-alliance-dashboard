import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type ThreadRow = {
  thread_key: string;
  subject: string | null;
  preview: string | null;
  last_from: string | null;
  last_message_at: string | null;
  unread_count: number;
};

type MsgRow = {
  thread_key: string;
  from_name: string;
  to_name: string;
  subject_norm: string | null;
  body: any;
  created_at_norm: string;
  from_user_id_norm: string;
  to_user_id_norm: string | null;
};

type PlayerOpt = { user_id: string; display_name: string; player_id: string };

function fmt(dt?: string | null) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleString(); } catch { return dt; }
}

export default function MyMailThreadsPage() {
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<MsgRow[]>([]);
  const [status, setStatus] = useState<string>("");

  const [players, setPlayers] = useState<PlayerOpt[]>([]);
  const [toUserId, setToUserId] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [body, setBody] = useState<string>("");

  async function loadThreads() {
    setStatus("Loading threads…");
    const res = await supabase.from("v_my_mail_threads").select("*");
    if (res.error) { setStatus(res.error.message); setThreads([]); return; }
    const rows = (res.data ?? []) as any as ThreadRow[];
    setThreads(rows);
    setStatus("");
    if (!selected && rows.length) setSelected(rows[0].thread_key);
  }

  async function loadMsgs(threadKey: string) {
    setStatus("Loading messages…");
    const res = await supabase
      .from("v_my_mail_messages")
      .select("*")
      .eq("thread_key", threadKey)
      .order("created_at_norm", { ascending: true });

    if (res.error) { setStatus(res.error.message); setMsgs([]); return; }
    setMsgs((res.data ?? []) as any);
    setStatus("");

    // mark read
    await supabase.rpc("mail_mark_thread_read", { p_thread_key: threadKey });
    await loadThreads();
  }

  async function loadPlayers() {
    const res = await supabase.from("v_approved_players").select("user_id,display_name,player_id").order("display_name", { ascending: true });
    if (res.error) return;
    setPlayers((res.data ?? []) as any);
  }

  useEffect(() => { void loadPlayers(); void loadThreads(); }, []);
  useEffect(() => { if (selected) void loadMsgs(selected); }, [selected]);

  const selectedThread = useMemo(() => threads.find(t => t.thread_key === selected) ?? null, [threads, selected]);

  async function send() {
    if (!toUserId) return alert("Pick a player.");
    if (!body.trim()) return alert("Message body required.");

    setStatus("Sending…");
    const r = await supabase.rpc("mail_send_message", {
      p_to_user_id: toUserId,
      p_subject: subject || null,
      p_body: body,
      p_alliance_code: null
    });

    if (r.error) { setStatus(r.error.message); return; }

    setSubject("");
    setBody("");
    setStatus("Sent ✅");

    await loadThreads();
    window.setTimeout(() => setStatus(""), 900);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>My Mail — Threads</h2>
        <SupportBundleButton />
      </div>

      <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>
        {status ? status : `Threads: ${threads.length}`}
      </div>

      {/* Compose */}
      <div className="zombie-card" style={{ marginTop: 12, padding: 14, borderRadius: 16 }}>
        <div style={{ fontWeight: 950 }}>Send a message</div>
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          <select value={toUserId} onChange={(e) => setToUserId(e.target.value)}>
            <option value="">Select player…</option>
            {players.map(p => (
              <option key={p.user_id} value={p.user_id}>{p.display_name}</option>
            ))}
          </select>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (optional)" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Write your message…" />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="button" onClick={() => void send()}>Send</button>
          </div>
        </div>
      </div>

      {/* Threads + Messages */}
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "360px 1fr", gap: 12 }}>
        <div className="zombie-card" style={{ padding: 12, borderRadius: 16 }}>
          <div style={{ fontWeight: 950 }}>Threads</div>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {threads.map(t => (
              <button
                key={t.thread_key}
                type="button"
                className="zombie-card"
                onClick={() => setSelected(t.thread_key)}
                style={{
                  padding: 10,
                  borderRadius: 14,
                  textAlign: "left",
                  border: t.thread_key === selected ? "1px solid rgba(120,255,120,0.55)" : "1px solid rgba(255,255,255,0.12)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.subject || "(no subject)"}
                  </div>
                  {t.unread_count ? (
                    <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.25)" }}>
                      {t.unread_count}
                    </span>
                  ) : null}
                </div>
                <div style={{ marginTop: 6, opacity: 0.85, fontSize: 12 }}>
                  {t.preview || ""}
                </div>
                <div style={{ marginTop: 6, opacity: 0.7, fontSize: 11 }}>
                  {fmt(t.last_message_at)}
                </div>
              </button>
            ))}
            {!threads.length ? <div style={{ opacity: 0.8 }}>No threads yet.</div> : null}
          </div>
        </div>

        <div className="zombie-card" style={{ padding: 12, borderRadius: 16 }}>
          <div style={{ fontWeight: 950 }}>
            {selectedThread ? (selectedThread.subject || "(no subject)") : "Messages"}
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {msgs.map((m, idx) => (
              <div key={m.created_at_norm + ":" + idx} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 900 }}>{m.from_name}</div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>{fmt(m.created_at_norm)}</div>
                </div>
                <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{String(m.body ?? "")}</div>
              </div>
            ))}
            {!msgs.length ? <div style={{ opacity: 0.8 }}>No messages in this thread.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
