import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";
import { useTranslation } from "react-i18next";

type Recipient = { user_id: string; display_name: string };

type ThreadRow = {
  thread_id: string;
  peer_user_id: string | null;
  peer_display_name: string | null;
  last_message_at: string;
  last_preview: string;
  unread_count: number;
};

type Msg = {
  id: string;
  created_at: string;
  created_by_user_id: string;
  sender_display_name?: string | null;
  body: string;
};

export default function MyMailThreadsPage() {
  const { t } = useTranslation();
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState("");

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [toUserId, setToUserId] = useState("");

  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    (async () => {
      const u = await supabase.auth.getUser();
      const uid = u.data.user?.id ?? "";
      setUserId(uid);
      if (uid) {
        await loadRecipients();
        await loadThreads();
      }
    })();
  }, []);

  async function loadRecipients() {
    setStatus(t("common.loading"));
    const res = await supabase.rpc("list_dm_recipients");
    if (res.error) { setStatus(res.error.message); return; }
    setRecipients((res.data ?? []) as any);
    setStatus("");
  }

  async function loadThreads() {
    setStatus(t("common.loading"));
    const res = await supabase.from("v_my_mail_threads").select("*").order("last_message_at", { ascending: false }).limit(200);
    if (res.error) { setStatus(res.error.message); return; }
    const list = (res.data ?? []) as any as ThreadRow[];
    setThreads(list);
    setStatus("");
    if (!selectedThreadId && list[0]?.thread_id) setSelectedThreadId(list[0].thread_id);
  }

  async function loadMessages(threadId: string) {
    if (!threadId) { setMessages([]); return; }
    setStatus(t("common.loading"));
    const res = await supabase
      .from("v_my_mail_inbox")
      .select("id,created_at,created_by_user_id,sender_display_name,body")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(500);

    if (res.error) { setStatus(res.error.message); return; }
    setMessages((res.data ?? []) as any);
    setStatus("");

    await supabase.rpc("mark_thread_read", { p_thread_id: threadId });
    await loadThreads();
  }

  useEffect(() => { void loadMessages(selectedThreadId); }, [selectedThreadId]);

  const selectedThread = useMemo(
    () => threads.find((t) => t.thread_id === selectedThreadId) ?? null,
    [threads, selectedThreadId]
  );

  async function send() {
    if (!userId) return alert("Sign in first.");
    const to = (selectedThread?.peer_user_id ?? toUserId ?? "").trim();
    const b = body.trim();
    if (!to || !b) return alert("Recipient and message are required.");

    setStatus(t("common.sending"));
    const res = await supabase.rpc("send_direct_message", {
      p_to_user_id: to,
      p_subject: subject.trim(),
      p_body: b,
    });
    if (res.error) { setStatus(res.error.message); return; }

    setSubject("");
    setBody("");
    setToUserId("");

    await loadThreads();

    const refreshed = await supabase.from("v_my_mail_threads").select("*").limit(200);
    if (!refreshed.error) {
      const list = (refreshed.data ?? []) as any as ThreadRow[];
      const match = list.find((t) => t.peer_user_id === to);
      if (match) setSelectedThreadId(match.thread_id);
    }

    setStatus(t("common.sent"));
    window.setTimeout(() => setStatus(""), 1000);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>{t("mailThreads.title")}</h1>
      <div style={{ opacity: 0.8, marginTop: 6 }}>
        {userId ? "✅" : ""} {status ? " • " + status : ""}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginTop: 12 }}>
        <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900, display: "flex", justifyContent: "space-between" }}>
            <span>{t("mailThreads.threads")}</span>
            <button onClick={loadThreads}>{t("common.reload")}</button>
          </div>

          <div style={{ padding: 12, display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 900 }}>{t("mailThreads.newDm")}</div>
            <select value={toUserId} onChange={(e) => { setToUserId(e.target.value); setSelectedThreadId(""); }}>
              <option value="">{t("mailThreads.selectPlayer")}</option>
              {recipients.map((r) => (
                <option key={r.user_id} value={r.user_id}>{r.display_name}</option>
              ))}
            </select>
            <button onClick={loadRecipients}>{t("mailThreads.refreshRecipients")}</button>

            <hr style={{ opacity: 0.3 }} />

            <div style={{ display: "grid", gap: 8 }}>
              {threads.map((trow) => (
                <button
                  key={trow.thread_id}
                  onClick={() => setSelectedThreadId(trow.thread_id)}
                  style={{ textAlign: "left", padding: 10, borderRadius: 10, border: "1px solid #222" }}
                >
                  <div style={{ fontWeight: 900 }}>
                    {trow.unread_count ? `(${trow.unread_count}) ` : ""}{trow.peer_display_name ?? "Direct"}
                  </div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>
                    {new Date(trow.last_message_at).toLocaleString()} • {trow.last_preview}
                  </div>
                </button>
              ))}
              {threads.length === 0 ? <div style={{ opacity: 0.75 }}>—</div> : null}
            </div>
          </div>
        </div>

        <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>
            {selectedThread ? `${t("mailThreads.selectThread")}: ${selectedThread.peer_display_name ?? ""}` : (toUserId ? t("mailThreads.newMessage") : t("mailThreads.selectThread"))}
          </div>

          <div style={{ padding: 12 }}>
            {selectedThreadId ? (
              <>
                <div style={{ display: "grid", gap: 10 }}>
                  {messages.map((m) => {
                    const mine = m.created_by_user_id === userId;
                    return (
                      <div key={m.id} style={{ border: "1px solid #222", borderRadius: 10, padding: 10 }}>
                        <div style={{ opacity: 0.75, fontSize: 12 }}>
                          {new Date(m.created_at).toLocaleString()} • {mine ? "You" : (m.sender_display_name ?? "Sender")}
                        </div>
                        <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{m.body}</div>
                      </div>
                    );
                  })}
                </div>
                <hr style={{ margin: "16px 0", opacity: 0.3 }} />
              </>
            ) : null}

            <div style={{ display: "grid", gap: 8 }}>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("mailThreads.subjectOptional")} />
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder={t("mailThreads.messagePlaceholder")} />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={send} disabled={!userId || (!selectedThreadId && !toUserId)}>{t("mailThreads.send")}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
