import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

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
  from_name: string | null;
  to_name: string | null;
  subject_norm: string | null;
  body: unknown;
  created_at_norm: string;
  from_user_id_norm: string | null;
  to_user_id_norm: string | null;
};

type RecipientRow = {
  id?: string;
  user_id?: string;
  display_name?: string;
  game_name?: string;
  alliance_code?: string;
};

function s(v: unknown) {
  return v === null || v === undefined ? "" : String(v);
}

function fmt(dt?: string | null) {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return s(dt);
  }
}

function isDmThread(threadKey: string) {
  return s(threadKey).startsWith("dm:");
}

function bodyText(value: unknown) {
  return s(value);
}

export default function MyMailThreadsPage() {
  const nav = useNavigate();
  const location = useLocation();

  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<MsgRow[]>([]);

  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [toUserId, setToUserId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [replyBody, setReplyBody] = useState("");

  const requestedThreadKey = useMemo(() => {
    const raw = new URLSearchParams(location.search).get("thread");
    return s(raw).trim();
  }, [location.search]);

  async function loadRecipients() {
    const res = await supabase.rpc("list_dm_recipients");
    if (!res.error) setRecipients((res.data ?? []) as RecipientRow[]);
  }

  async function loadThreads() {
    const res = await supabase
      .from("v_my_mail_threads")
      .select("*")
      .order("last_message_at", { ascending: false });

    if (res.error) {
      setStatus(res.error.message || "Failed to load threads.");
      setThreads([]);
      return;
    }

    setThreads((res.data ?? []) as ThreadRow[]);
  }

  async function loadMsgs(threadKey: string) {
    setStatus("Loading messages…");

    const res = await supabase
      .from("v_my_mail_messages")
      .select("*")
      .eq("thread_key", threadKey)
      .order("created_at_norm", { ascending: true });

    if (res.error) {
      setStatus(res.error.message || "Failed to load messages.");
      setMsgs([]);
      return;
    }

    setMsgs((res.data ?? []) as MsgRow[]);
    setStatus("");

    await supabase.rpc("mail_mark_thread_read", { p_thread_key: threadKey } as any);
    await loadThreads();
  }

  async function loadAll() {
    setLoading(true);
    setStatus("");

    const auth = await supabase.auth.getUser();
    setUserId(s(auth.data?.user?.id));

    try {
      await Promise.all([loadRecipients(), loadThreads()]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (!threads.length) {
      if (selected !== null) setSelected(null);
      return;
    }

    if (requestedThreadKey) {
      const exists = threads.some((t) => t.thread_key === requestedThreadKey);
      if (exists) {
        if (selected !== requestedThreadKey) setSelected(requestedThreadKey);
        return;
      }
    }

    const selectedExists = !!selected && threads.some((t) => t.thread_key === selected);
    if (!selectedExists) {
      setSelected(threads[0].thread_key);
    }
  }, [threads, requestedThreadKey, selected]);

  useEffect(() => {
    const current = s(new URLSearchParams(location.search).get("thread")).trim();
    const next = s(selected).trim();
    if (current === next) return;

    const params = new URLSearchParams(location.search);
    if (next) params.set("thread", next);
    else params.delete("thread");

    const qs = params.toString();
    nav(qs ? `/mail-threads?${qs}` : "/mail-threads", { replace: true });
  }, [selected, location.search, nav]);

  useEffect(() => {
    if (selected) void loadMsgs(selected);
    else setMsgs([]);
  }, [selected]);

  const selectedThread = useMemo(
    () => threads.find((t) => t.thread_key === selected) ?? null,
    [threads, selected]
  );

  const replyPeer = useMemo(() => {
    if (!selected || !isDmThread(selected) || !userId || !msgs.length) return null;

    for (let i = msgs.length - 1; i >= 0; i -= 1) {
      const m = msgs[i];
      const fromId = s(m.from_user_id_norm);
      const toId = s(m.to_user_id_norm);

      if (fromId && fromId !== userId) {
        return { id: fromId, name: s(m.from_name || fromId) };
      }

      if (toId && toId !== userId) {
        return { id: toId, name: s(m.to_name || toId) };
      }
    }

    return null;
  }, [selected, userId, msgs]);

  async function openNewestThreadForRecipient(targetUserId: string) {
    const res = await supabase
      .from("v_my_mail_threads")
      .select("*")
      .order("last_message_at", { ascending: false });

    if (res.error) return;

    const rows = (res.data ?? []) as any[];
    const match = rows.find((r) => {
      const a = s(r?.peer_user_id || r?.other_user_id || r?.to_user_id);
      const b = s(r?.from_user_id);
      return a === s(targetUserId) || b === s(targetUserId);
    });

    if (s(match?.thread_key).trim()) {
      setSelected(s(match.thread_key));
    } else if (rows.length) {
      setSelected(s(rows[0]?.thread_key));
    }
  }
  async function deleteSelectedThread() {
    const key = s(selected).trim();
    if (!key) return;

    if (!window.confirm("Delete this thread? This cannot be undone.")) return;

    setStatus("Deleting thread…");

    const r = await supabase.rpc("mail_delete_thread", { p_thread_key: key } as any);
    if (r.error) {
      setStatus(r.error.message || "Delete failed.");
      return;
    }

    setMsgs([]);
    setSelected(null);
    setStatus("Thread deleted ✅");
    await loadThreads();
  }


  async function sendNew() {
    if (!userId) {
      setStatus("You must be signed in.");
      return;
    }

    if (!toUserId) {
      setStatus("Pick a player.");
      return;
    }

    if (!body.trim()) {
      setStatus("Message body required.");
      return;
    }

    setStatus("Sending…");

    const r = await supabase.rpc("mail_send_message", {
      p_to_user_id: toUserId,
      p_subject: s(subject).trim() || null,
      p_body: body,
      p_alliance_code: null,
    } as any);

    if (r.error) {
      setStatus(r.error.message || "Send failed.");
      return;
    }

    const target = toUserId;
    setSubject("");
    setBody("");
    setStatus("Mail sent ✅");

    await loadThreads();
    await openNewestThreadForRecipient(target);
  }

  async function sendReply() {
    if (!userId) {
      setStatus("You must be signed in.");
      return;
    }

    if (!selected) {
      setStatus("No thread selected.");
      return;
    }

    if (!isDmThread(selected)) {
      setStatus("Reply is only available for direct threads.");
      return;
    }

    if (!replyPeer?.id) {
      setStatus("Could not determine the reply target.");
      return;
    }

    if (!replyBody.trim()) {
      setStatus("Reply body required.");
      return;
    }

    setStatus("Sending reply…");

    const r = await supabase.rpc("mail_send_message", {
      p_to_user_id: replyPeer.id,
      p_subject: null,
      p_body: replyBody,
      p_alliance_code: null,
    } as any);

    if (r.error) {
      setStatus(r.error.message || "Reply failed.");
      return;
    }

    setReplyBody("");
    setStatus("Reply sent ✅");
    await loadMsgs(selected);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1400, margin: "0 auto", display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>💬 My Mail — Threads</h2>
          <div style={{ opacity: 0.75, marginTop: 4 }}>
            Deep-linkable thread view with reply support for direct messages.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="zombie-btn" type="button" onClick={() => nav("/mail")}>Mail Home</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/mail-v2")}>Inbox</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/mail-broadcast")}>Broadcast</button>
            <button
              className="zombie-btn"
              type="button"
              onClick={() => void deleteSelectedThread()}
              disabled={!selected}
              style={{
                border: "1px solid rgba(255,120,120,0.35)",
                background: "rgba(255,120,120,0.08)"
              }}
            >
              Delete Thread
            </button>
          <button className="zombie-btn" type="button" onClick={() => void loadAll()} disabled={loading}>Refresh</button>
        </div>
      </div>

      {status ? (
        <div
          style={{
            border:
              s(status).includes("✅")
                ? "1px solid rgba(120,255,120,0.35)"
                : /failed|error|required|must/i.test(s(status))
                ? "1px solid rgba(255,120,120,0.35)"
                : "1px solid rgba(255,255,255,0.10)",
            background:
              s(status).includes("✅")
                ? "rgba(120,255,120,0.08)"
                : /failed|error|required|must/i.test(s(status))
                ? "rgba(255,120,120,0.08)"
                : "rgba(255,255,255,0.04)",
            borderRadius: 14,
            padding: 12,
          }}
        >
          {status}
        </div>
      ) : null}

      <div
        style={{
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.04)",
          borderRadius: 16,
          padding: 14,
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Start a New Direct Thread</div>

        <div style={{ display: "grid", gap: 8 }}>
          <select
            className="zombie-input"
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value)}
            style={{ width: "100%", padding: "10px 12px" }}
          >
            <option value="">Select player…</option>
            {recipients.map((r, i) => {
              const id = s(r.user_id || r.id);
              const label = s(r.display_name || r.game_name || r.user_id || r.id || "Unknown");
              const alliance = s(r.alliance_code).trim().toUpperCase();
              return (
                <option key={`${id}-${i}`} value={id}>
                  {alliance ? `${label} (${alliance})` : label}
                </option>
              );
            })}
          </select>

          <input
            className="zombie-input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject (optional)"
            style={{ width: "100%", padding: "10px 12px" }}
          />

          <textarea
            className="zombie-input"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Write your message..."
            style={{ width: "100%", padding: "10px 12px", resize: "vertical" }}
          />

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              className="zombie-btn"
              type="button"
              onClick={() => void sendNew()}
              disabled={!userId || !toUserId || !body.trim()}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 12 }}>
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 16,
            padding: 12,
          }}
        >
          <div style={{ fontWeight: 900 }}>Threads</div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {threads.map((t) => (
              <button
                key={t.thread_key}
                type="button"
                className="zombie-card"
                onClick={() => setSelected(t.thread_key)}
                style={{
                  padding: 10,
                  borderRadius: 14,
                  textAlign: "left",
                  border:
                    t.thread_key === selected
                      ? "1px solid rgba(120,255,120,0.55)"
                      : "1px solid rgba(255,255,255,0.12)",
                  background: Number(t.unread_count || 0) > 0 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.16)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s(t.subject) || "(no subject)"}
                  </div>

                  {Number(t.unread_count || 0) > 0 ? (
                    <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.25)" }}>
                      {t.unread_count}
                    </span>
                  ) : null}
                </div>

                <div style={{ marginTop: 6, opacity: 0.85, fontSize: 12 }}>
                  {s(t.preview)}
                </div>

                <div style={{ marginTop: 6, opacity: 0.7, fontSize: 11 }}>
                  {fmt(t.last_message_at)}
                </div>
              </button>
            ))}

            {!threads.length ? <div style={{ opacity: 0.8 }}>No threads yet.</div> : null}
          </div>
        </div>

        <div
          style={{
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 16,
            padding: 12,
          }}
        >
          <div style={{ fontWeight: 900 }}>
            {selectedThread ? (s(selectedThread.subject) || "(no subject)") : "Messages"}
          </div>

          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>
            {selected ? `Thread key: ${selected}` : "Select a thread to read messages."}
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {msgs.map((m, idx) => (
              <div
                key={`${s(m.created_at_norm)}:${idx}`}
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 14,
                  padding: 12,
                  background: "rgba(0,0,0,0.16)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 900 }}>{s(m.from_name || "Unknown")}</div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>{fmt(m.created_at_norm)}</div>
                </div>

                <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                  {bodyText(m.body)}
                </div>
              </div>
            ))}

            {!msgs.length ? (
              <div style={{ opacity: 0.8 }}>
                {selected ? "No messages in this thread." : "Select a thread to read messages."}
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontWeight: 900 }}>Reply</div>
              <div style={{ opacity: 0.75, fontSize: 12 }}>
                {!selected
                  ? "No thread selected."
                  : !isDmThread(selected)
                  ? "Reply disabled for broadcast threads."
                  : replyPeer
                  ? `To: ${replyPeer.name}`
                  : "Finding peer…"}
              </div>
            </div>

            <textarea
              className="zombie-input"
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              rows={4}
              placeholder={replyPeer ? "Write your reply..." : "Reply not available."}
              style={{ width: "100%", marginTop: 8, padding: "10px 12px", resize: "vertical" }}
              disabled={!selected || !isDmThread(selected) || !replyPeer}
            />

            <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
              <button
                className="zombie-btn"
                type="button"
                onClick={() => void sendReply()}
                disabled={!selected || !isDmThread(selected) || !replyPeer || !replyBody.trim()}
              >
                Send Reply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


