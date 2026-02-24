import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";

type Recipient = { user_id: string; display_name: string };

type MailItem = {
  id: string;
  created_at: string;
  kind: "direct" | "alliance_broadcast" | "state_broadcast";
  subject: string;
  body: string;

  sender_display_name?: string | null;

  direction?: "in" | "out" | null;
  peer_user_id?: string | null;
  peer_display_name?: string | null;

  thread_id?: string | null;
};

async function copyToClipboard(text: string) {
  try { await navigator.clipboard.writeText(text); alert("Copied"); }
  catch { alert("Copy failed"); }
}

export default function MyMailInboxPage() {
  const [userId, setUserId] = useState<string>("");
  const [items, setItems] = useState<MailItem[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [toUserId, setToUserId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [filterKind, setFilterKind] = useState<string>("");
  const [q, setQ] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? "";
      if (!mounted) return;
      setUserId(uid);
      if (uid) {
        await loadRecipients();
        await refresh();
      }
    })();

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadRecipients() {
    const res = await supabase.rpc("list_dm_recipients");
    if (!res.error) setRecipients((res.data ?? []) as any);
  }

  async function refresh() {
    setLoading(true);
    setStatus("Loading…");
    const res = await supabase.from("v_my_mail_inbox").select("*").order("created_at", { ascending: false }).limit(200);
    if (res.error) { setStatus(res.error.message); setLoading(false); return; }
    setItems((res.data ?? []) as any);
    setStatus("");
    setLoading(false);
  }

  async function sendDirect() {
    const to = toUserId.trim();
    const b = body.trim();
    if (!to || !b) return alert("Recipient and body required.");

    setLoading(true);
    setStatus("Sending…");

    const res = await supabase.rpc("send_direct_message", {
      p_to_user_id: to,
      p_subject: subject.trim(),
      p_body: b,
    });

    if (res.error) { setStatus(res.error.message); setLoading(false); return; }

    setToUserId("");
    setSubject("");
    setBody("");

    await refresh();
    setStatus("Sent ✅");
    window.setTimeout(() => setStatus(""), 1200);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((m) => {
      if (filterKind && m.kind !== filterKind) return false;
      if (!qq) return true;
      const hay = `${m.subject} ${m.body} ${m.kind} ${m.sender_display_name ?? ""} ${m.peer_display_name ?? ""}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [items, filterKind, q]);

  function whoLine(m: MailItem) {
    const sender = m.sender_display_name || "Unknown";
    if (m.kind !== "direct") return `From: ${sender}`;
    if (m.direction === "out") return `To: ${m.peer_display_name ?? "Unknown"}`;
    return `From: ${sender}`;
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>My Mail (Supabase)</h1>
      <div style={{ opacity: 0.8, marginTop: 6 }}>
        {userId ? "Signed in ✅" : "Not signed in"}{loading ? " • Loading…" : ""}{status ? " • " + status : ""}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
        <button disabled={!userId || loading} onClick={refresh}>Refresh</button>
        <button disabled={!userId || loading} onClick={loadRecipients}>Refresh recipients</button>
        <select value={filterKind} onChange={(e) => setFilterKind(e.target.value)}>
          <option value="">(all)</option>
          <option value="direct">direct</option>
          <option value="alliance_broadcast">alliance broadcast</option>
          <option value="state_broadcast">state broadcast</option>
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search…" />
        <div style={{ opacity: 0.75 }}>Showing {filtered.length}</div>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>Send Direct Message</div>
        <div style={{ padding: 12, display: "grid", gap: 10 }}>
          <div>
            <div style={{ opacity: 0.75, fontSize: 12 }}>Recipient (approved players)</div>
            <select value={toUserId} onChange={(e) => setToUserId(e.target.value)}>
              <option value="">(select)</option>
              {recipients.map((r) => <option key={r.user_id} value={r.user_id}>{r.display_name}</option>)}
            </select>
          </div>

          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (optional)..." />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Message body..." />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button disabled={!userId || loading || !toUserId || !body.trim()} onClick={sendDirect}>Send</button>
          </div>
        </div>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      <div style={{ display: "grid", gap: 12 }}>
        {filtered.map((m) => (
          <div key={m.id} style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: 12, borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900 }}>[{m.kind}] {m.subject || "(no subject)"}</div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>
                  {new Date(m.created_at).toLocaleString()} • {whoLine(m)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => copyToClipboard(m.body)}>Copy</button>
                <button onClick={() => copyToClipboard(JSON.stringify(m, null, 2))}>Copy JSON</button>
              </div>
            </div>
            <div style={{ padding: 12, whiteSpace: "pre-wrap" }}>{m.body}</div>
          </div>
        ))}
        {filtered.length === 0 ? <div style={{ opacity: 0.7 }}>No mail yet.</div> : null}
      </div>
    </div>
  );
}
