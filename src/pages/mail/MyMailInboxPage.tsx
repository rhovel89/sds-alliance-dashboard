import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type RecipientRow = {
  id?: string;
  user_id?: string;
  display_name?: string;
  game_name?: string;
  alliance_code?: string;
};

type MailItem = {
  id?: string;
  created_at?: string;
  kind?: string | null;
  subject?: string | null;
  body?: string | null;
  sender_display_name?: string | null;
  from_display_name?: string | null;
  direction?: string | null;
  peer_user_id?: string | null;
  peer_display_name?: string | null;
  unread_count?: number | null;
  thread_key?: string | null;
  thread_id?: string | null;
};

function s(v: unknown) {
  return v === null || v === undefined ? "" : String(v);
}

function threadKeyOf(m: MailItem) {
  return s(m.thread_key || m.thread_id).trim();
}

function niceDate(v: unknown) {
  try {
    const d = new Date(s(v));
    return Number.isNaN(d.getTime()) ? s(v) : d.toLocaleString();
  } catch {
    return s(v);
  }
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function MyMailInboxPage() {
  const nav = useNavigate();

  const [userId, setUserId] = useState("");
  const [items, setItems] = useState<MailItem[]>([]);
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const [toUserId, setToUserId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [filterKind, setFilterKind] = useState("");
  const [q, setQ] = useState("");

  async function loadRecipients() {
    const res = await supabase.rpc("list_dm_recipients");
    if (!res.error) setRecipients((res.data ?? []) as RecipientRow[]);
  }

  async function refresh() {
    setLoading(true);
    setStatus("Loading…");

    const res = await supabase
      .from("v_my_mail_inbox")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (res.error) {
      setStatus(res.error.message || "Failed to load inbox.");
      setItems([]);
      setLoading(false);
      return;
    }

    setItems((res.data ?? []) as MailItem[]);
    setStatus("");
    setLoading(false);
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      const auth = await supabase.auth.getUser();
      const uid = s(auth.data?.user?.id);
      if (!alive) return;
      setUserId(uid);

      if (uid) {
        await loadRecipients();
        await refresh();
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function sendDirect() {
    const to = s(toUserId).trim();
    const msg = s(body).trim();

    if (!userId) {
      setStatus("You must be signed in.");
      return;
    }

    if (!to) {
      setStatus("Select a player recipient.");
      return;
    }

    if (!msg) {
      setStatus("Message body required.");
      return;
    }

    setLoading(true);
    setStatus("Sending…");

    const res = await supabase.rpc("mail_send_message", {
      p_to_user_id: to,
      p_subject: s(subject).trim() || null,
      p_body: msg,
      p_alliance_code: null,
    } as any);

    if (res.error) {
      setStatus(res.error.message || "Send failed.");
      setLoading(false);
      return;
    }

    setToUserId("");
    setSubject("");
    setBody("");
    await refresh();
    setStatus("Mail sent ✅");
    setLoading(false);
  }

  async function markThreadRead(threadKey: string) {
    const key = s(threadKey).trim();
    if (!key) return;

    setStatus("Marking thread read…");
    const r = await supabase.rpc("mail_mark_thread_read", { p_thread_key: key } as any);

    if (r.error) {
      setStatus(r.error.message || "Mark read failed.");
      return;
    }

    await refresh();
    setStatus("Thread marked read ✅");
  }

  const filtered = useMemo(() => {
    const needle = s(q).trim().toLowerCase();

    return items.filter((m) => {
      if (filterKind && s(m.kind) !== filterKind) return false;
      if (!needle) return true;

      const hay = `${s(m.subject)} ${s(m.body)} ${s(m.kind)} ${s(m.sender_display_name || m.from_display_name)} ${s(m.peer_display_name)}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [items, filterKind, q]);

  function whoLine(m: MailItem) {
    const sender = s(m.sender_display_name || m.from_display_name || "Unknown");
    if (s(m.kind) !== "direct") return `From: ${sender}`;
    if (s(m.direction) === "out") return `To: ${s(m.peer_display_name || "Unknown")}`;
    return `From: ${sender}`;
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto", display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>📨 My Mail — Inbox</h1>
          <div style={{ opacity: 0.75, marginTop: 4 }}>
            Full inbox list with direct compose, thread access, and read tools.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="zombie-btn" type="button" onClick={() => nav("/mail")}>Mail Home</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/mail-threads")}>Threads</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/mail-broadcast")}>Broadcast</button>
          <button className="zombie-btn" type="button" onClick={() => void refresh()} disabled={loading}>Refresh</button>
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
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Compose Direct Mail</div>

        <div style={{ display: "grid", gap: 10 }}>
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
            placeholder="Optional subject"
            style={{ width: "100%", padding: "10px 12px" }}
          />

          <textarea
            className="zombie-input"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder="Write your message..."
            style={{ width: "100%", padding: "10px 12px", resize: "vertical" }}
          />

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              className="zombie-btn"
              type="button"
              disabled={!userId || loading || !toUserId || !body.trim()}
              onClick={() => void sendDirect()}
            >
              Send Mail
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.04)",
          borderRadius: 16,
          padding: 14,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontWeight: 900 }}>Inbox List</div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select
              className="zombie-input"
              value={filterKind}
              onChange={(e) => setFilterKind(e.target.value)}
              style={{ padding: "10px 12px" }}
            >
              <option value="">All kinds</option>
              <option value="direct">Direct</option>
              <option value="alliance_broadcast">Alliance Broadcast</option>
              <option value="state_broadcast">State Broadcast</option>
            </select>

            <input
              className="zombie-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search inbox..."
              style={{ minWidth: 220, padding: "10px 12px" }}
            />
          </div>
        </div>

        <div style={{ opacity: 0.72, marginBottom: 10 }}>
          Showing {filtered.length} of {items.length}
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((m, idx) => {
            const threadKey = threadKeyOf(m);

            return (
              <div
                key={`${s(m.id)}-${idx}`}
                style={{
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "rgba(0,0,0,0.16)",
                }}
              >
                <div style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>
                      [{s(m.kind) || "mail"}] {s(m.subject) || "(no subject)"}
                    </div>
                    <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
                      {niceDate(m.created_at)} • {whoLine(m)}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className="zombie-btn"
                      type="button"
                      onClick={() => void copyToClipboard(s(m.body)).then((ok) => alert(ok ? "Copied." : "Copy failed."))}
                    >
                      Copy
                    </button>

                    <button
                      className="zombie-btn"
                      type="button"
                      onClick={() => void copyToClipboard(JSON.stringify(m, null, 2)).then((ok) => alert(ok ? "Copied." : "Copy failed."))}
                    >
                      JSON
                    </button>

                    <button
                      className="zombie-btn"
                      type="button"
                      onClick={() => nav(threadKey ? `/mail-threads?thread=${encodeURIComponent(threadKey)}` : "/mail-threads")}
                    >
                      Open Thread
                    </button>

                    <button
                      className="zombie-btn"
                      type="button"
                      onClick={() => void markThreadRead(threadKey)}
                      disabled={!threadKey || Number(m.unread_count || 0) <= 0}
                    >
                      Mark Read
                    </button>
                  </div>
                </div>

                <div style={{ padding: 12, whiteSpace: "pre-wrap" }}>
                  {s(m.body)}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 ? (
            <div style={{ opacity: 0.7 }}>
              {items.length === 0 ? "No mail yet." : "No mail matches the current filters."}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
