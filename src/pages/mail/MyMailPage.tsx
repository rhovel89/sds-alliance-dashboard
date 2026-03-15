import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type RecipientRow = {
  id?: string;
  user_id?: string;
  display_name?: string;
  game_name?: string;
  alliance_code?: string | null;
};

type InboxRow = {
  id?: string;
  created_at?: string | null;
  subject?: string | null;
  body?: string | null;
  kind?: string | null;
  direction?: string | null;
  from_display_name?: string | null;
  peer_display_name?: string | null;
  sender_display_name?: string | null;
  unread_count?: number | null;
  thread_key?: string | null;
  thread_id?: string | null;
};

type ThreadRow = {
  thread_key?: string | null;
  unread_count?: number | null;
};

const MAIL_HOME_DRAFT_KEY = "sad_mail_home_draft_v2";

function s(v: unknown) {
  return v === null || v === undefined ? "" : String(v);
}

function threadKeyOf(row: Partial<InboxRow>) {
  return s(row.thread_key || row.thread_id).trim();
}

function identityOf(row: Partial<InboxRow>) {
  return s(row.id).trim() || ("thread:" + threadKeyOf(row));
}

function buildMailThreadLink(threadKey: string): string {
  const params = new URLSearchParams();
  if (s(threadKey).trim()) params.set("thread", s(threadKey).trim());
  return "/mail-threads?" + params.toString();
}

function loadMailHomeDraft() {
  try {
    const raw = localStorage.getItem(MAIL_HOME_DRAFT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveMailHomeDraft(next: unknown) {
  try {
    localStorage.setItem(MAIL_HOME_DRAFT_KEY, JSON.stringify(next || {}));
  } catch {}
}

function clearMailHomeDraft() {
  try {
    localStorage.removeItem(MAIL_HOME_DRAFT_KEY);
  } catch {}
}

function previewSnippet(m: Partial<InboxRow>, max = 180) {
  const text = s(m.body).replace(/\s+/g, " ").trim();
  if (!text) return "(no preview)";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function niceDate(v: unknown) {
  try {
    const d = new Date(s(v));
    if (Number.isNaN(d.getTime())) return s(v);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);
    const timeText = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    if (diffDays === 0) return "Today, " + timeText;
    if (diffDays === 1) return "Yesterday, " + timeText;

    return d.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return s(v);
  }
}

function kindBadge(kind: string) {
  const v = s(kind).trim() || "mail";
  return v === "direct"
    ? "direct"
    : v === "alliance_broadcast"
    ? "alliance broadcast"
    : v === "state_broadcast"
    ? "state broadcast"
    : v;
}

export default function MyMailPage() {
  const nav = useNavigate();

  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [items, setItems] = useState<InboxRow[]>([]);
  const [threads, setThreads] = useState<ThreadRow[]>([]);

  const initialDraft = loadMailHomeDraft();

  const [toUserId, setToUserId] = useState(() => s(initialDraft?.toUserId));
  const [recipientSearch, setRecipientSearch] = useState(() => s(initialDraft?.recipientSearch));
  const [subject, setSubject] = useState(() => s(initialDraft?.subject));
  const [body, setBody] = useState(() => s(initialDraft?.body));

  const [filterKind, setFilterKind] = useState("");
  const [mailTab, setMailTab] = useState("all");
  const [q, setQ] = useState("");
  const [selectedIdentity, setSelectedIdentity] = useState("");

  function recipientLabel(r: RecipientRow) {
    const name = s(r.display_name || r.game_name || r.user_id || r.id || "Unknown");
    const alliance = s(r.alliance_code).trim().toUpperCase();
    return alliance ? name + " (" + alliance + ")" : name;
  }

  async function loadRecipients() {
    const res = await supabase.rpc("list_dm_recipients");
    if (!res.error) setRecipients((res.data ?? []) as RecipientRow[]);
  }

  async function refreshInbox() {
    const res = await supabase
      .from("v_my_mail_inbox")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (res.error) {
      setStatus(res.error.message || "Failed to load inbox.");
      setItems([]);
      return;
    }

    setItems((res.data ?? []) as InboxRow[]);
  }

  async function refreshThreads() {
    const res = await supabase
      .from("v_my_mail_threads")
      .select("thread_key, unread_count")
      .order("last_message_at", { ascending: false });

    if (!res.error) setThreads((res.data ?? []) as ThreadRow[]);
  }

  async function loadAll() {
    setLoading(true);
    setStatus("");

    const auth = await supabase.auth.getUser();
    const uid = s(auth.data?.user?.id);
    setUserId(uid);

    try {
      await Promise.all([loadRecipients(), refreshInbox(), refreshThreads()]);
      setStatus("");
    } catch (e: any) {
      setStatus(s(e?.message || e));
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

  const filteredRecipients = useMemo(() => {
    const needle = s(recipientSearch).trim().toLowerCase();
    if (!needle) return recipients;

    return recipients.filter((r) => {
      const text = (recipientLabel(r) + " " + s(r.display_name) + " " + s(r.game_name) + " " + s(r.alliance_code)).toLowerCase();
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
        mailTab === "all"
          ? true
          : mailTab === "inbox"
          ? direction !== "out"
          : mailTab === "sent"
          ? direction === "out"
          : mailTab === "broadcast"
          ? kind === "alliance_broadcast" || kind === "state_broadcast"
          : true;

      const text = (
        s(m.subject) + " " +
        s(m.body) + " " +
        s(m.from_display_name) + " " +
        s(m.sender_display_name) + " " +
        s(m.peer_display_name)
      ).toLowerCase();

      const textOk = !needle || text.includes(needle);
      return kindOk && tabOk && textOk;
    });
  }, [items, filterKind, mailTab, q]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedIdentity("");
      return;
    }

    const exists = filtered.some((m) => identityOf(m) === selectedIdentity);
    if (!exists) setSelectedIdentity(identityOf(filtered[0]));
  }, [filtered, selectedIdentity]);

  const selectedMail = useMemo(() => {
    return filtered.find((m) => identityOf(m) === selectedIdentity) ?? filtered[0] ?? null;
  }, [filtered, selectedIdentity]);

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

  const unreadTotal = useMemo(() => {
    return threads.reduce((sum, row) => sum + Number(row.unread_count || 0), 0);
  }, [threads]);

  const totalThreads = useMemo(() => threads.length, [threads]);

  function pickRecipient(recipientId: string) {
    const id = s(recipientId);
    const r = recipients.find((x) => s(x.user_id || x.id) === id);
    setToUserId(id);
    setRecipientSearch(r ? recipientLabel(r) : "");
  }

  async function openNewestThreadForRecipient(targetUserId: string) {
    try {
      const res = await supabase
        .from("v_my_mail_threads")
        .select("*")
        .order("last_message_at", { ascending: false });

      if (res.error) {
        nav("/mail-threads");
        return;
      }

      const rows = (res.data ?? []) as any[];
      const match = rows.find((r) => {
        const a = s(r?.peer_user_id || r?.other_user_id || r?.to_user_id);
        const b = s(r?.from_user_id);
        return a === s(targetUserId) || b === s(targetUserId);
      });

      if (s(match?.thread_key).trim()) {
        nav("/mail-threads?thread=" + encodeURIComponent(s(match.thread_key)));
      } else {
        nav("/mail-threads");
      }
    } catch {
      nav("/mail-threads");
    }
  }

  async function sendDirectMail() {
    if (!userId) {
      setStatus("You must be signed in.");
      return;
    }

    if (!toUserId) {
      setStatus("Select a player recipient.");
      return;
    }

    if (!body.trim()) {
      setStatus("Message body required.");
      return;
    }

    setLoading(true);
    setStatus("Sending…");

    const targetUserId = toUserId;

    const r = await supabase.rpc("mail_send_message", {
      p_to_user_id: toUserId,
      p_subject: subject.trim() || null,
      p_body: body,
      p_alliance_code: null,
    } as any);

    if (r.error) {
      setStatus(r.error.message || "Send failed.");
      setLoading(false);
      return;
    }

    setRecipientSearch("");
    setToUserId("");
    setSubject("");
    setBody("");
    clearMailHomeDraft();
    setStatus("Mail sent ✅");

    await Promise.all([refreshInbox(), refreshThreads()]);
    setLoading(false);
    await openNewestThreadForRecipient(targetUserId);
  }

  function prefillReply(m: InboxRow) {
    const subjectText = s(m.subject).trim();
    const nextSubject = subjectText
      ? (subjectText.toLowerCase().startsWith("re:") ? subjectText : "Re: " + subjectText)
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

    pickRecipient(s(possibleRecipient?.user_id || possibleRecipient?.id));
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
    await Promise.all([refreshInbox(), refreshThreads()]);
  }

  async function deleteThread(threadKey: string) {
    const key = s(threadKey).trim();
    if (!key) return;

    if (!window.confirm("Delete this thread? This cannot be undone.")) return;

    setLoading(true);
    setStatus("Deleting thread…");

    const r = await supabase.rpc("mail_delete_thread", { p_thread_key: key } as any);

    if (r.error) {
      setStatus(r.error.message || "Delete failed.");
      setLoading(false);
      return;
    }

    setStatus("Thread deleted ✅");
    await Promise.all([refreshInbox(), refreshThreads()]);
    setLoading(false);
  }

  function markThreadUnread(threadKey: string) {
    const key = s(threadKey).trim();
    if (!key) return;
    setStatus("Unread tools live in the thread workspace. Opening thread…");
    nav("/mail-threads?thread=" + encodeURIComponent(key));
  }

  function whoLine(m: InboxRow) {
    const sender = s(m.sender_display_name || m.from_display_name || "Unknown");
    const peer = s(m.peer_display_name || "Unknown");
    if (s(m.kind) !== "direct") return "From: " + sender;
    if (s(m.direction) === "out") return "To: " + peer;
    return "From: " + sender;
  }

  const selectedThreadKey = threadKeyOf(selectedMail ?? {});

  return (
    <div style={{ padding: "16px 20px 28px 20px", width: "100%", maxWidth: "none", margin: 0, display: "grid", gap: 16 }}>
      <div
        className="zombie-card"
        style={{
          padding: 18,
          borderRadius: 18,
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <div style={{ minWidth: 320 }}>
          <div style={{ fontSize: 28, fontWeight: 950 }}>📫 Mail Command Center</div>
          <div style={{ opacity: 0.96, marginTop: 6 }}>
            Faster compose, cleaner inbox triage, and a full preview pane without forcing players into thread view first.
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <div className="zombie-card" style={{ padding: "10px 12px", borderRadius: 14, minWidth: 130 }}>
              <div style={{ fontSize: 12, opacity: 0.94 }}>Unread</div>
              <div style={{ fontWeight: 950, fontSize: 20 }}>{unreadTotal}</div>
            </div>
            <div className="zombie-card" style={{ padding: "10px 12px", borderRadius: 14, minWidth: 130 }}>
              <div style={{ fontSize: 12, opacity: 0.94 }}>Inbox Rows</div>
              <div style={{ fontWeight: 950, fontSize: 20 }}>{items.length}</div>
            </div>
            <div className="zombie-card" style={{ padding: "10px 12px", borderRadius: 14, minWidth: 130 }}>
              <div style={{ fontSize: 12, opacity: 0.94 }}>Threads</div>
              <div style={{ fontWeight: 950, fontSize: 20 }}>{totalThreads}</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="zombie-btn" type="button" onClick={() => void loadAll()} disabled={loading}>Refresh</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/mail-v2")}>Open Inbox List</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/mail-threads")}>Open Threads</button>
        </div>
      </div>

      {status ? (
        <div
          className="zombie-card"
          style={{
            padding: 12,
            borderRadius: 16,
            border:
              s(status).includes("✅")
                ? "1px solid rgba(120,255,120,0.35)"
                : /failed|error|required|must/i.test(s(status))
                ? "1px solid rgba(255,120,120,0.35)"
                : "1px solid rgba(255,255,255,0.12)",
            background:
              s(status).includes("✅")
                ? "rgba(120,255,120,0.08)"
                : /failed|error|required|must/i.test(s(status))
                ? "rgba(255,120,120,0.08)"
                : "rgba(255,255,255,0.04)",
          }}
        >
          {status}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "minmax(320px, 380px) minmax(380px, 1fr) minmax(360px, 0.95fr)",
          alignItems: "start",
        }}
      >
        <div className="zombie-card" style={{ padding: 16, borderRadius: 18, display: "grid", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 950, fontSize: 20 }}>Compose Direct Mail</div>
            <div style={{ opacity: 0.95, marginTop: 4, fontSize: 12, color: "rgba(245,247,255,0.92)" }}>
              Search a player, pick them once, then write. Players should not have to fight the form.
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 12, opacity: 0.96 }}>Recipient search</label>
            <input
              className="zombie-input"
              value={recipientSearch}
              onChange={(e) => setRecipientSearch(e.target.value)}
              placeholder="Search recipient..."
              style={{ width: "100%", padding: "12px 14px" }}
            />

            <label style={{ fontSize: 12, opacity: 0.96 }}>Recipient</label>
            <select
              className="zombie-input"
              value={toUserId}
              onChange={(e) => pickRecipient(e.target.value)}
              style={{ width: "100%", padding: "12px 14px" }}
            >
              <option value="">Select player…</option>
              {filteredRecipients.slice(0, 200).map((r, i) => {
                const id = s(r.user_id || r.id);
                return (
                  <option key={id + "-" + i} value={id}>
                    {recipientLabel(r)}
                  </option>
                );
              })}
            </select>

            <div style={{ fontSize: 12, opacity: 0.95 }}>
              {selectedRecipientLabel ? "Selected: " + selectedRecipientLabel : "No recipient selected"}
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 12, opacity: 0.96 }}>Subject</label>
            <input
              className="zombie-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Optional subject"
              style={{ width: "100%", padding: "12px 14px" }}
            />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 12, opacity: 0.96 }}>Message</label>
            <textarea
              className="zombie-input"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              placeholder="Write your message..."
              style={{ width: "100%", padding: "12px 14px", resize: "vertical" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, opacity: 0.95 }}>
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
              onClick={() => {
                setRecipientSearch("");
                setToUserId("");
                setSubject("");
                setBody("");
                clearMailHomeDraft();
                setStatus("Draft cleared.");
              }}
            >
              Clear
            </button>
          </div>

          <div style={{ marginTop: 4, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)", display: "grid", gap: 6 }}>
            <Link to="/mail-v2">Open full inbox list</Link>
            <Link to="/mail-threads">Open full thread workspace</Link>
          </div>
        </div>

        <div className="zombie-card" style={{ padding: 16, borderRadius: 18, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 950, fontSize: 20 }}>Inbox</div>
              <div style={{ opacity: 0.95, fontSize: 12, color: "rgba(245,247,255,0.92)" }}>Pick a row to preview it instantly.</div>
            </div>
            <div style={{ opacity: 0.962, fontSize: 12, color: "rgba(245,247,255,0.92)" }}>
              Showing {filtered.length} of {items.length}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { key: "all", label: "All", count: tabCounts.all },
              { key: "inbox", label: "Inbox", count: tabCounts.inbox },
              { key: "sent", label: "Sent", count: tabCounts.sent },
              { key: "broadcast", label: "Broadcast", count: tabCounts.broadcast },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setMailTab(tab.key)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  fontWeight: 800,
                  border: mailTab === tab.key ? "1px solid rgba(200,255,200,0.35)" : "1px solid rgba(255,255,255,0.14)",
                  background: mailTab === tab.key ? "rgba(120,255,120,0.10)" : "rgba(255,255,255,0.03)",
                  cursor: "pointer",
                }}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "minmax(180px, 220px) minmax(220px, 1fr) auto" }}>
            <select
              className="zombie-input"
              value={filterKind}
              onChange={(e) => setFilterKind(e.target.value)}
              style={{ padding: "12px 14px" }}
            >
              <option value="">All kinds</option>
              <option value="direct">Direct</option>
              <option value="alliance_broadcast">Alliance broadcast</option>
              <option value="state_broadcast">State broadcast</option>
            </select>

            <input
              className="zombie-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search inbox..."
              style={{ padding: "12px 14px" }}
            />

            <button
              className="zombie-btn"
              type="button"
              onClick={() => {
                setFilterKind("");
                setMailTab("all");
                setQ("");
              }}
            >
              Reset Filters
            </button>
          </div>

          <div style={{ display: "grid", gap: 10, maxHeight: "calc(100vh - 320px)", overflow: "auto", paddingRight: 4 }}>
            {filtered.map((m, idx) => {
              const active = identityOf(m) === identityOf(selectedMail ?? {});
              const unread = Number(m.unread_count || 0) > 0;

              return (
                <button
                  key={identityOf(m) + "-" + idx}
                  type="button"
                  onClick={() => setSelectedIdentity(identityOf(m))}
                  style={{
                    textAlign: "left", color: "#F5F7FF", textShadow: "0 1px 0 rgba(0,0,0,0.45)",
                    width: "100%",
                    padding: 14,
                    borderRadius: 16,
                    cursor: "pointer",
                    border: active
                      ? "1px solid rgba(200,255,200,0.35)"
                      : unread
                      ? "1px solid rgba(255,255,255,0.22)"
                      : "1px solid rgba(255,255,255,0.08)",
                    background: active
                      ? "rgba(120,255,120,0.08)"
                      : unread
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.16)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <div style={{ fontWeight: unread ? 950 : 900, fontSize: 18 }}>
                          {s(m.subject) || "(no subject)"}
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "4px 8px",
                            borderRadius: 999,
                            border: "1px solid rgba(255,255,255,0.14)",
                            opacity: 0.9,
                          }}
                        >
                          {kindBadge(s(m.kind))}
                        </span>
                        {unread ? (
                          <span
                            style={{
                              fontSize: 11,
                              padding: "4px 8px",
                              borderRadius: 999,
                              border: "1px solid rgba(255,120,120,0.35)",
                              background: "rgba(255,120,120,0.10)",
                              fontWeight: 900,
                            }}
                          >
                            Unread • {Number(m.unread_count || 0)}
                          </span>
                        ) : null}
                      </div>

                      <div style={{ opacity: 0.95, fontSize: 12, marginTop: 6 }}>
                        {whoLine(m)}
                      </div>

                      <div style={{ opacity: 0.9, marginTop: 10, lineHeight: 1.45 }}>
                        {previewSnippet(m)}
                      </div>
                    </div>

                    <div style={{ opacity: 0.92, fontSize: 12, whiteSpace: "nowrap" }}>
                      {niceDate(m.created_at)}
                    </div>
                  </div>
                </button>
              );
            })}

            {filtered.length === 0 ? (
              <div style={{ opacity: 0.92, padding: 16 }}>
                {items.length === 0 ? "No mail yet." : "No mail matches the current filters."}
              </div>
            ) : null}
          </div>
        </div>

        <div className="zombie-card" style={{ padding: 16, borderRadius: 18, display: "grid", gap: 12, alignSelf: "stretch" }}>
          <div>
            <div style={{ fontWeight: 950, fontSize: 20 }}>Preview</div>
            <div style={{ opacity: 0.95, fontSize: 12, color: "rgba(245,247,255,0.92)" }}>Read the selected message before opening a thread.</div>
          </div>

          {!selectedMail ? (
            <div style={{ opacity: 0.92, padding: 20, border: "1px dashed rgba(255,255,255,0.16)", borderRadius: 16 }}>
              Select an inbox row to preview it here.
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ fontWeight: 950, fontSize: 24 }}>{s(selectedMail.subject) || "(no subject)"}</div>
                    <span
                      style={{
                        fontSize: 12,
                        padding: "4px 8px",
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.14)",
                      }}
                    >
                      {kindBadge(s(selectedMail.kind))}
                    </span>
                    {Number(selectedMail.unread_count || 0) > 0 ? (
                      <span
                        style={{
                          fontSize: 12,
                          padding: "4px 8px",
                          borderRadius: 999,
                          border: "1px solid rgba(255,120,120,0.35)",
                          background: "rgba(255,120,120,0.10)",
                          fontWeight: 900,
                        }}
                      >
                        Unread • {Number(selectedMail.unread_count || 0)}
                      </span>
                    ) : null}
                  </div>

                  <div style={{ opacity: 0.96, marginTop: 6 }}>{whoLine(selectedMail)}</div>
                </div>

                <div style={{ opacity: 0.92, fontSize: 12, color: "rgba(245,247,255,0.92)" }}>{niceDate(selectedMail.created_at)}</div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="zombie-btn"
                  type="button"
                  onClick={() => nav(selectedThreadKey ? buildMailThreadLink(selectedThreadKey) : "/mail-threads")}
                >
                  Open Thread
                </button>

                <button
                  className="zombie-btn"
                  type="button"
                  onClick={() => prefillReply(selectedMail)}
                  disabled={s(selectedMail.kind) !== "direct"}
                >
                  Reply
                </button>

                <button
                  className="zombie-btn"
                  type="button"
                  onClick={() => void markThreadRead(selectedThreadKey)}
                  disabled={!selectedThreadKey || Number(selectedMail.unread_count || 0) <= 0}
                >
                  Mark Read
                </button>

                <button
                  className="zombie-btn"
                  type="button"
                  onClick={() => markThreadUnread(selectedThreadKey)}
                  disabled={!selectedThreadKey}
                >
                  Unread Tools
                </button>

                <button
                  className="zombie-btn"
                  type="button"
                  onClick={() => void deleteThread(selectedThreadKey)}
                  disabled={!selectedThreadKey}
                  style={{
                    border: "1px solid rgba(255,120,120,0.35)",
                    background: "rgba(255,120,120,0.08)",
                  }}
                >
                  Delete
                </button>
              </div>

              <div
                style={{
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 16,
                  padding: 16,
                  background: "rgba(0,0,0,0.18)",
                  whiteSpace: "pre-wrap", color: "#F5F7FF",
                  lineHeight: 1.55,
                  minHeight: 320,
                }}
              >
                {s(selectedMail.body) || "(empty message)"}
              </div>

              <div style={{ fontSize: 12, opacity: 0.94 }}>
                Fast action: reply loads back into the compose pane on the left.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
