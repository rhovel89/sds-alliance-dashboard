import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type RecipientRow = {
  id?: string;
  user_id?: string;
  display_name?: string;
  game_name?: string;
  alliance_code?: string;
};

const MAIL_HOME_DRAFT_KEY = "sad_mail_home_draft_v1";
type InboxRow = {
  id?: string;
  created_at?: string;
  subject?: string | null;
  body?: string | null;
  kind?: string | null;
  direction?: string | null;
  from_display_name?: string | null;
  peer_display_name?: string | null;
  sender_display_name?: string | null;
  unread_count?: number | null;
  thread_key?: string | null;
};

function s(v: any) {
  return v === null || v === undefined ? "" : String(v);
}

function buildMailThreadLink(threadKey: string): string {
  const params = new URLSearchParams();
  if (String(threadKey || "").trim()) params.set("thread", String(threadKey || "").trim());
  return `/mail-threads?${params.toString()}`;
}

function loadMailHomeDraft() {
  try {
    const raw = localStorage.getItem(MAIL_HOME_DRAFT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveMailHomeDraft(next: any) {
  try {
    localStorage.setItem(MAIL_HOME_DRAFT_KEY, JSON.stringify(next || {}));
  } catch {}
}

function clearMailHomeDraft() {
  try {
    localStorage.removeItem(MAIL_HOME_DRAFT_KEY);
  } catch {}
}

function previewSnippet(m: InboxRow) {
  const text = s(m.body).replace(/\s+/g, " ").trim();
  if (!text) return "(no preview)";
  return text.length > 160 ? text.slice(0, 160) + "…" : text;
}

function niceDate(v: any) {
  try {
    return new Date(String(v || "")).toLocaleString();
  } catch {
    return String(v || "");
  }
}

export default function MyMailPage() {
  const nav = useNavigate();

  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [items, setItems] = useState<InboxRow[]>([]);

  const initialDraft = loadMailHomeDraft();

  const [toUserId, setToUserId] = useState(() => s(initialDraft?.toUserId));
  const [recipientSearch, setRecipientSearch] = useState(() => s(initialDraft?.recipientSearch));
  const [subject, setSubject] = useState(() => s(initialDraft?.subject));
  const [body, setBody] = useState(() => s(initialDraft?.body));

  const [filterKind, setFilterKind] = useState("");
  const [mailTab, setMailTab] = useState("all");
  const [q, setQ] = useState("");

  async function loadRecipients() {
    const res = await supabase.rpc("list_dm_recipients");
    if (!res.error) setRecipients((res.data ?? []) as any);
  }

  async function refreshInbox() {
    setLoading(true);
    const res = await supabase
      .from("v_my_mail_inbox")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (res.error) {
      setStatus(res.error.message);
      setItems([]);
      setLoading(false);
      return;
    }

    setItems((res.data ?? []) as any);
    setStatus("");
    setLoading(false);
  }

  async function loadAll() {
    setLoading(true);
    setStatus("");

    const auth = await supabase.auth.getUser();
    const uid = String(auth.data?.user?.id || "");
    setUserId(uid);

    try {
      await Promise.all([loadRecipients(), refreshInbox()]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    saveMailHomeDraft({
      toUserId,
      recipientSearch,
      subject,
      body,
    });
  }, [toUserId, recipientSearch, subject, body]);

  async function openNewestThreadForRecipient(targetUserId: string) {
    try {
      const res = await supabase
        .from("v_my_mail_threads")
        .select("*")
        .order("last_message_at", { ascending: false });

      if (res.error) return;

      const rows = (res.data ?? []) as any[];
      const match = rows.find((r) => {
        const a = String(r?.peer_user_id || r?.other_user_id || r?.to_user_id || "");
        const b = String(r?.from_user_id || "");
        return a === String(targetUserId || "") || b === String(targetUserId || "");
      });

      if (match?.thread_key) {
        nav(`/mail-threads?thread=${encodeURIComponent(String(match.thread_key))}`);
      } else {
        nav("/mail-threads");
      }
    } catch {
      nav("/mail-threads");
    }
  }

  async function sendDirectMail() {
    if (!userId) return setStatus("You must be signed in.");
    if (!toUserId) return setStatus("Select a player recipient.");
    if (!body.trim()) return setStatus("Message body required.");

    setLoading(true);
    setStatus("Sending…");

    const targetUserId = toUserId;

    const r = await supabase.rpc("mail_send_message", {
      p_to_user_id: toUserId,
      p_subject: subject || null,
      p_body: body,
      p_alliance_code: null,
    } as any);

    if (r.error) {
      setStatus(r.error.message || "Send failed.");
      setLoading(false);
      return;
    }

    setRecipientSearch("");
    setSubject("");
    setBody("");
    clearMailHomeDraft();
    setStatus("Mail sent ✅");
    await refreshInbox();
    setLoading(false);
    await openNewestThreadForRecipient(targetUserId);
  }

  const filteredRecipients = useMemo(() => {
    const needle = s(recipientSearch).trim().toLowerCase();
    if (!needle) return recipients;

    return recipients.filter((r) => {
      const text = `${recipientLabel(r)} ${s(r.display_name)} ${s(r.game_name)} ${s(r.alliance_code)}`.toLowerCase();
      return text.includes(needle);
    });
  }, [recipients, recipientSearch]);

  const filtered = useMemo(() => {
    const needle = s(q).trim().toLowerCase();

    return items.filter((m) => {
      const kind = s(m.kind);
      const direction = s(m.direction);

      const kindOk = !filterKind || kind === filterKind;

      const tabOk =
        mailTab === "all" ? true :
        mailTab === "inbox" ? direction !== "out" :
        mailTab === "sent" ? direction === "out" :
        mailTab === "broadcast" ? kind === "alliance_broadcast" || kind === "state_broadcast" :
        true;

      const text =
        `${s(m.subject)} ${s(m.body)} ${s(m.from_display_name)} ${s(m.sender_display_name)} ${s(m.peer_display_name)}`.toLowerCase();
      const textOk = !needle || text.includes(needle);

      return kindOk && tabOk && textOk;
    });
  }, [items, filterKind, mailTab, q]);

  const selectedRecipientLabel = useMemo(() => {
    const r = recipients.find((x) => s(x.user_id || x.id) === s(toUserId));
    return r ? recipientLabel(r) : "";
  }, [recipients, toUserId]);

  const tabCounts = useMemo(() => {
    return {
      all: items.length,
      inbox: items.filter((m) => s(m.direction) !== "out").length,
      sent: items.filter((m) => s(m.direction) === "out").length,
      broadcast: items.filter((m) => {
        const kind = s(m.kind);
        return kind === "alliance_broadcast" || kind === "state_broadcast";
      }).length,
    };
  }, [items]);

  const activeFilterSummary = useMemo(() => {
    const parts: string[] = [];

    if (mailTab !== "all") {
      parts.push(
        mailTab === "inbox" ? "Inbox" :
        mailTab === "sent" ? "Sent" :
        mailTab === "broadcast" ? "Broadcast" :
        "All"
      );
    }

    if (filterKind) {
      parts.push(filterKind);
    }

    if (s(q).trim()) {
      parts.push(s(q).trim());
    }

    return parts;
  }, [mailTab, filterKind, q]);

  function pickRecipient(recipientId: string) {
    const id = s(recipientId);
    const r = recipients.find((x) => s(x.user_id || x.id) === id);
    setToUserId(id);
    setRecipientSearch(r ? recipientLabel(r) : "");
  }
  function recipientLabel(r: RecipientRow) {
    const name = s(r.display_name || r.game_name || r.user_id || r.id || "Unknown");
    const alliance = s(r.alliance_code || "").trim().toUpperCase();
    return alliance ? `${name} (${alliance})` : name;
  }

  function prefillReply(m: InboxRow) {
    const directTarget = s(m.direction) === "out"
      ? ""
      : "";
    const subjectText = s(m.subject).trim();
    const nextSubject = subjectText
      ? (subjectText.toLowerCase().startsWith("re:") ? subjectText : `Re: ${subjectText}`)
      : "";

    const possibleRecipient = recipients.find((r) => {
      const label = recipientLabel(r);
      return (
        label === s(m.peer_display_name) ||
        label === s(m.sender_display_name) ||
        s(r.display_name) === s(m.peer_display_name) ||
        s(r.display_name) === s(m.sender_display_name) ||
        s(r.game_name) === s(m.peer_display_name) ||
        s(r.game_name) === s(m.sender_display_name)
      );
    });

    pickRecipient(s(possibleRecipient?.user_id || possibleRecipient?.id || ""));
    setSubject(nextSubject);
    setBody("");
    setStatus("Reply loaded into composer ✅");
    window.scrollTo({ top: 0, behavior: "smooth" });
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

    setStatus("Thread marked read ✅");
    await refreshInbox();
  }

  async function markThreadUnread(threadKey: string) {
    const key = s(threadKey).trim();
    if (!key) return;

    setStatus("Unread tools are not available on Mail Home yet. Opening thread view…");
    nav(`/mail-threads?thread=${encodeURIComponent(key)}`);
  }

  function whoLine(m: InboxRow) {
    const sender = s(m.sender_display_name || m.from_display_name || "Unknown");
    const peer = s(m.peer_display_name || "Unknown");
    if (s(m.kind) !== "direct") return `From: ${sender}`;
    if (s(m.direction) === "out") return `To: ${peer}`;
    return `From: ${sender}`;
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: 16, display: "grid", gap: 12 }}>
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.04)",
          borderRadius: 16,
          padding: 16,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>📬 My Mail</div>
          <div style={{ opacity: 0.75, marginTop: 4 }}>
            Player-to-player mail, inbox preview, and quick access to full threads.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="zombie-btn" type="button" onClick={() => void loadAll()} disabled={loading}>
            Refresh
          </button>
          <button className="zombie-btn" type="button" onClick={() => nav("/mail-v2")}>
            Open Inbox
          </button>
          <button className="zombie-btn" type="button" onClick={() => nav("/mail-threads")}>
            Open Threads
          </button>
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
            fontWeight: s(status).includes("✅") ? 700 : 500,
          }}
        >
          {status}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)", gap: 12 }}>
        <div style={{ display: "grid", gap: 12 }}>
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
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 12, opacity: 0.75 }}>Recipient</div>
                <input
                  className="zombie-input"
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  placeholder="Search recipient..."
                  style={{ width: "100%", padding: "10px 12px" }}
                />
                <select
                  className="zombie-input"
                  value={toUserId}
                  onChange={(e) => pickRecipient(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px" }}
                >
                  <option value="">Select player…</option>
                  {filteredRecipients.map((r, i) => {
                    const id = s(r.user_id || r.id);
                    return (
                      <option key={`${id}-${i}`} value={id}>
                        {recipientLabel(r)}
                      </option>
                    );
                  })}
                </select>
                {selectedRecipientLabel ? (
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    Selected: {selectedRecipientLabel}
                  </div>
                ) : null}
              </div>

              <div><div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>Subject</div>
                <input
                  className="zombie-input"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Optional subject"
                  style={{ width: "100%", padding: "10px 12px" }}
                />
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>Message</div>
                <textarea
                  className="zombie-input"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  placeholder="Write your message..."
                  style={{ width: "100%", padding: "10px 12px", resize: "vertical" }}
                />
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.72, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <span>{body.trim() ? "Ready to send" : "Message body required"}</span>
                  <span>{body.length} chars</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="zombie-btn"
                  type="button"
                  disabled={!userId || loading || !toUserId || !body.trim()}
                  onClick={() => void sendDirectMail()}
                >
                  Send Mail
                </button>

                <button
                  className="zombie-btn"
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setToUserId("");
                    setRecipientSearch("");
                    setSubject("");
                    setBody("");
                    clearMailHomeDraft();
                    setStatus("Draft cleared.");
                  }}
                >
                  Clear
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
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Other Mail Views</div>
            <div style={{ opacity: 0.72, fontSize: 12, marginBottom: 10 }}>
              Jump into the full inbox list or the dedicated thread workspace.
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <Link to="/mail-v2">Open full inbox list</Link>
              <Link to="/mail-threads">Open full thread workspace</Link>
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <div style={{ fontWeight: 900 }}>Inbox Preview</div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="zombie-btn"
                type="button"
                onClick={() => setMailTab("all")}
                style={mailTab === "all" ? { fontWeight: 900, outline: "2px solid rgba(255,255,255,0.22)" } : undefined}
              >
                All ({tabCounts.all})
              </button>
              <button
                className="zombie-btn"
                type="button"
                onClick={() => setMailTab("inbox")}
                style={mailTab === "inbox" ? { fontWeight: 900, outline: "2px solid rgba(255,255,255,0.22)" } : undefined}
              >
                Inbox ({tabCounts.inbox})
              </button>
              <button
                className="zombie-btn"
                type="button"
                onClick={() => setMailTab("sent")}
                style={mailTab === "sent" ? { fontWeight: 900, outline: "2px solid rgba(255,255,255,0.22)" } : undefined}
              >
                Sent ({tabCounts.sent})
              </button>
              <button
                className="zombie-btn"
                type="button"
                onClick={() => setMailTab("broadcast")}
                style={mailTab === "broadcast" ? { fontWeight: 900, outline: "2px solid rgba(255,255,255,0.22)" } : undefined}
              >
                Broadcast ({tabCounts.broadcast})
              </button>

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

              <button
                className="zombie-btn"
                type="button"
                onClick={() => {
                  setMailTab("all");
                  setFilterKind("");
                  setQ("");
                }}
              >
                Reset Filters
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)" }}>
              All {tabCounts.all}
            </span>
            <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)" }}>
              Inbox {tabCounts.inbox}
            </span>
            <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)" }}>
              Sent {tabCounts.sent}
            </span>
            <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)" }}>
              Broadcast {tabCounts.broadcast}
            </span>
          </div>

          <div style={{ opacity: 0.75, marginBottom: 6 }}>
            Showing {filtered.length} of {items.length}
          </div>

          {activeFilterSummary.length > 0 ? (
            <div style={{ opacity: 0.68, marginBottom: 10, fontSize: 12 }}>
              Active: {activeFilterSummary.join(" • ")}
            </div>
          ) : null}

          <div style={{ display: "grid", gap: 8 }}>
            {filtered.length === 0 ? (
              <div style={{ opacity: 0.7 }}>{items.length === 0 ? "No mail yet." : "No mail matches the current filters."}</div>
            ) : (
              filtered.map((m, i) => (
                <div
                  key={`${s(m.id)}-${i}`}
                  style={{
                    border: Number(m.unread_count || 0) > 0 ? "1px solid rgba(255,255,255,0.22)" : "1px solid rgba(255,255,255,0.08)",
                    background: Number(m.unread_count || 0) > 0 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.16)",
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <div style={{ fontWeight: Number(m.unread_count || 0) > 0 ? 950 : 900 }}>
                          {s(m.subject) || "(no subject)"}
                        </div>
                        {Number(m.unread_count || 0) > 0 ? (
                          <span
                            style={{
                              fontSize: 11,
                              padding: "3px 8px",
                              borderRadius: 999,
                              border: "1px solid rgba(255,255,255,0.10)",
                              background: "rgba(255,255,255,0.08)"
                            }}
                          >
                            Unread • {Number(m.unread_count || 0)}
                          </span>
                        ) : null}
                        {s(m.kind) ? (
                          <span
                            style={{
                              fontSize: 11,
                              padding: "3px 8px",
                              borderRadius: 999,
                              border: "1px solid rgba(255,255,255,0.10)",
                              background: "rgba(255,255,255,0.05)"
                            }}
                          >
                            {s(m.kind)}
                          </span>
                        ) : null}
                      </div>
                      <div style={{ opacity: 0.78, fontSize: 12, marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span>{whoLine(m)}</span>
                        {String(m.thread_key || "").trim() ? (
                          <span style={{ opacity: 0.6 }}>• Thread ready</span>
                        ) : null}
                      </div>
                    </div>

                    <div style={{ opacity: 0.65, fontSize: 12, whiteSpace: "nowrap" }}>
                      {niceDate(m.created_at)}
                    </div>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <div style={{ opacity: 0.9, lineHeight: 1.45 }}>
                      {previewSnippet(m)}
                    </div>
                    {String(m.thread_key || "").trim() ? (
                      <div style={{ opacity: 0.6, fontSize: 12, marginTop: 6 }}>
                        Thread: {s(m.thread_key)}
                      </div>
                    ) : null}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    <button
                      className="zombie-btn"
                      type="button"
                      onClick={() => nav("/mail-v2")}
                    >
                      Open Inbox
                    </button>

                    <button
                      className="zombie-btn"
                      type="button"
                      onClick={() => nav(buildMailThreadLink(String(m.thread_key || "")))}
                      disabled={!String(m.thread_key || "").trim()}
                    >
                      Open Thread
                    </button>

                    <button
                      className="zombie-btn"
                      type="button"
                      onClick={() => prefillReply(m)}
                      disabled={s(m.kind) !== "direct"}
                    >
                      Reply
                    </button>

                    <button
                      className="zombie-btn"
                      type="button"
                      onClick={() => void markThreadRead(String(m.thread_key || ""))}
                      disabled={!String(m.thread_key || "").trim() || Number(m.unread_count || 0) <= 0}
                    >
                      Mark Read
                    </button>

                    <button
                      className="zombie-btn"
                      type="button"
                      onClick={() => void markThreadUnread(String(m.thread_key || ""))}
                      disabled={!String(m.thread_key || "").trim()}
                    >
                      Unread Tools
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
































