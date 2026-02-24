import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";

type ThreadRow = {
  thread_id: string;
  peer_user_id: string | null;
  peer_display_name: string | null;
  last_message_at: string;
  last_subject: string;
  last_preview: string;
  unread_count: number;
  pinned: boolean;
  archived: boolean;
};

type Msg = {
  id: string;
  created_at: string;
  created_by_user_id: string;
  sender_display_name?: string | null;
  body: string;
  subject: string;
  direction?: "in" | "out" | null;
};

type Player = { id: string; name: string | null; game_name: string | null };

export default function MyMailThreadsPage() {
  const [userId, setUserId] = useState<string>("");
  const [status, setStatus] = useState("");
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string>("");

  const [messages, setMessages] = useState<Msg[]>([]);

  // compose
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // start new thread
  const [playerQuery, setPlayerQuery] = useState("");
  const [playerResults, setPlayerResults] = useState<Player[]>([]);
  const [linkMap, setLinkMap] = useState<Record<string, string>>({}); // player_id -> user_id
  const [toUserId, setToUserId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const u = await supabase.auth.getUser();
      const uid = u.data.user?.id ?? "";
      setUserId(uid);
      if (uid) await loadThreads();
    })();
  }, []);

  async function loadThreads() {
    setStatus("Loading threads…");
    const res = await supabase.from("v_my_mail_threads").select("*").order("last_message_at", { ascending: false }).limit(200);
    if (res.error) { setStatus(res.error.message); return; }
    const list = (res.data ?? []) as any as ThreadRow[];
    setThreads(list);
    setStatus("");

    if (!selectedThreadId && list[0]?.thread_id) {
      setSelectedThreadId(list[0].thread_id);
    }
  }

  async function loadMessages(threadId: string) {
    if (!threadId) { setMessages([]); return; }
    setStatus("Loading messages…");
    const res = await supabase
      .from("v_my_mail_inbox")
      .select("id,created_at,created_by_user_id,sender_display_name,body,subject,direction")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(500);

    if (res.error) { setStatus(res.error.message); return; }
    setMessages((res.data ?? []) as any);
    setStatus("");

    // mark read
    await supabase.rpc("mark_thread_read", { p_thread_id: threadId });
    await loadThreads();
  }

  useEffect(() => { void loadMessages(selectedThreadId); }, [selectedThreadId]);

  const selectedThread = useMemo(() => threads.find((t) => t.thread_id === selectedThreadId) ?? null, [threads, selectedThreadId]);

  async function searchPlayers() {
    const qq = playerQuery.trim();
    if (!qq) return;

    setStatus("Searching players…");

    const pRes = await supabase
      .from("players")
      .select("id,name,game_name")
      .or(`name.ilike.%${qq}%,game_name.ilike.%${qq}%`)
      .limit(20);

    if (pRes.error) { setStatus(pRes.error.message); return; }

    const players = (pRes.data ?? []) as any as Player[];
    setPlayerResults(players);

    const ids = players.map((p) => p.id);
    if (ids.length) {
      const lRes = await supabase.from("player_auth_links").select("player_id,user_id").in("player_id", ids);
      if (!lRes.error) {
        const map: Record<string, string> = {};
        (lRes.data ?? []).forEach((x: any) => (map[String(x.player_id)] = String(x.user_id)));
        setLinkMap(map);
      }
    }

    setStatus("");
  }

  function pickRecipient(p: Player) {
    const uid = linkMap[p.id];
    if (!uid) return alert("That player is not linked to an auth user yet.");
    setToUserId(uid);
    setPlayerResults([]);
    setPlayerQuery("");
  }

  async function send() {
    if (!userId) return alert("Sign in first.");
    const to = (selectedThread?.peer_user_id ?? toUserId).trim();
    const b = body.trim();
    if (!to || !b) return alert("Recipient and body are required.");

    setStatus("Sending…");
    const res = await supabase.rpc("send_direct_message", {
      p_to_user_id: to,
      p_subject: subject.trim(),
      p_body: b,
    });

    if (res.error) { setStatus(res.error.message); return; }

    setBody("");
    setSubject("");

    await loadThreads();

    // select thread that matches peer (best effort)
    const refreshed = await supabase.from("v_my_mail_threads").select("*").limit(200);
    if (!refreshed.error) {
      const list = (refreshed.data ?? []) as any as ThreadRow[];
      const match = list.find((t) => t.peer_user_id === to);
      if (match) setSelectedThreadId(match.thread_id);
    }

    setStatus("Sent ✅");
    window.setTimeout(() => setStatus(""), 1000);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>My Mail Threads</h1>
      <div style={{ opacity: 0.8, marginTop: 6 }}>
        {userId ? "Signed in ✅" : "Not signed in"} {status ? " • " + status : ""}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginTop: 12 }}>
        {/* Left: thread list + new thread */}
        <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900, display: "flex", justifyContent: "space-between" }}>
            <span>Threads</span>
            <button onClick={loadThreads}>Reload</button>
          </div>

          <div style={{ padding: 12, display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 900 }}>Start new DM</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input value={playerQuery} onChange={(e) => setPlayerQuery(e.target.value)} placeholder="Search player…" style={{ flex: "1 1 200px" }} />
              <button onClick={searchPlayers} disabled={!userId}>Search</button>
            </div>
            {playerResults.length ? (
              <div style={{ display: "grid", gap: 8 }}>
                {playerResults.map((p) => (
                  <div key={p.id} style={{ border: "1px solid #222", borderRadius: 10, padding: 10, display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 900 }}>{p.name ?? "Player"}</div>
                      <div style={{ opacity: 0.75, fontSize: 12 }}>
                        {p.game_name ?? ""} • {linkMap[p.id] ? "linked ✅" : "not linked"}
                      </div>
                    </div>
                    <button onClick={() => pickRecipient(p)} disabled={!linkMap[p.id]}>Choose</button>
                  </div>
                ))}
              </div>
            ) : null}

            <hr style={{ opacity: 0.3 }} />

            <div style={{ display: "grid", gap: 8 }}>
              {threads.map((t) => {
                const active = t.thread_id === selectedThreadId;
                return (
                  <button
                    key={t.thread_id}
                    onClick={() => setSelectedThreadId(t.thread_id)}
                    style={{
                      textAlign: "left",
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid #222",
                      opacity: active ? 1 : 0.85,
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>
                      {t.unread_count ? `(${t.unread_count}) ` : ""}{t.peer_display_name ?? "Direct thread"}
                    </div>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>
                      {new Date(t.last_message_at).toLocaleString()} • {t.last_preview}
                    </div>
                  </button>
                );
              })}
              {threads.length === 0 ? <div style={{ opacity: 0.75 }}>No threads yet.</div> : null}
            </div>
          </div>
        </div>

        {/* Right: messages + compose */}
        <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>
            {selectedThread ? `Chat with ${selectedThread.peer_display_name ?? "player"}` : "Select a thread"}
          </div>

          <div style={{ padding: 12 }}>
            {selectedThreadId ? (
              <>
                <div style={{ display: "grid", gap: 10 }}>
                  {messages.map((m) => {
                    const mine = m.created_by_user_id === userId;
                    return (
                      <div key={m.id} style={{ border: "1px solid #222", borderRadius: 10, padding: 10, opacity: mine ? 1 : 0.95 }}>
                        <div style={{ opacity: 0.75, fontSize: 12 }}>
                          {new Date(m.created_at).toLocaleString()} • {mine ? "You" : (m.sender_display_name ?? "Sender")}
                        </div>
                        <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{m.body}</div>
                      </div>
                    );
                  })}
                  {messages.length === 0 ? <div style={{ opacity: 0.75 }}>No messages.</div> : null}
                </div>

                <hr style={{ margin: "16px 0", opacity: 0.3 }} />

                <div style={{ display: "grid", gap: 8 }}>
                  <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (optional)..." />
                  <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Message…" />
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button onClick={send} disabled={!userId}>Send</button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ opacity: 0.75 }}>Pick a thread on the left, or start a new DM.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
