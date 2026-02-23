import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";

type MailItem = {
  id: string;
  created_at: string;
  kind: "direct" | "alliance_broadcast" | "state_broadcast";
  state_code: string | null;
  alliance_code: string | null;
  subject: string;
  body: string;
  tags: string[];
  pinned: boolean;
  created_by_user_id: string;
};

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    alert("Copied");
  } catch {
    alert("Copy failed");
  }
}

export default function MyMailInboxPage() {
  const [userId, setUserId] = useState<string>("");
  const [items, setItems] = useState<MailItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const [filterKind, setFilterKind] = useState<string>("");
  const [q, setQ] = useState("");

  // direct compose (v1 uses recipient auth user_id)
  const [toUserId, setToUserId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? "";
      if (!mounted) return;
      setUserId(uid);
      if (uid) await refresh();
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? "";
      setUserId(uid);
      if (uid) void refresh();
      else setItems([]);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setLoading(true);
    setStatus("Loading…");
    const res = await supabase.from("v_my_mail_inbox").select("*").order("created_at", { ascending: false }).limit(200);
    if (res.error) {
      setStatus(res.error.message);
      setLoading(false);
      return;
    }
    setItems((res.data ?? []) as any);
    setStatus("");
    setLoading(false);
  }

  async function sendDirect() {
    const to = toUserId.trim();
    const b = body.trim();
    if (!to || !b) return alert("Recipient user_id and body are required.");

    setLoading(true);
    setStatus("Sending…");

    const ins = await supabase
      .from("mail_items")
      .insert({
        created_by_user_id: userId,
        kind: "direct",
        subject: subject.trim(),
        body: b,
      })
      .select("id")
      .single();

    if (ins.error) {
      setStatus(ins.error.message);
      setLoading(false);
      return;
    }

    const rec = await supabase.from("mail_direct_recipients").insert({ mail_id: ins.data.id, user_id: to });
    if (rec.error) {
      setStatus("Sent, but failed adding recipient: " + rec.error.message);
      setLoading(false);
      return;
    }

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
      const hay = `${m.subject} ${m.body} ${m.kind} ${m.state_code ?? ""} ${m.alliance_code ?? ""}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [items, filterKind, q]);

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>My Mail (Supabase)</h1>
      <div style={{ opacity: 0.8, marginTop: 6 }}>
        {userId ? "Signed in ✅" : "Not signed in"}{loading ? " • Loading…" : ""}{status ? " • " + status : ""}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
        <button disabled={!userId || loading} onClick={refresh}>Refresh</button>
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
        <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>Send Direct Message (v1)</div>
        <div style={{ padding: 12, display: "grid", gap: 10 }}>
          <div style={{ opacity: 0.75, fontSize: 12 }}>
            Recipient is the target’s <b>auth user_id (uuid)</b> for now (we can improve this to “pick by player name” next).
          </div>
          <input value={toUserId} onChange={(e) => setToUserId(e.target.value)} placeholder="Recipient user_id (uuid)..." />
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (optional)..." />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Message body..." />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button disabled={!userId || loading} onClick={sendDirect}>Send</button>
          </div>
        </div>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      <div style={{ display: "grid", gap: 12 }}>
        {filtered.map((m) => (
          <div key={m.id} style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: 12, borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900 }}>
                  {m.pinned ? "📌 " : ""}[{m.kind}] {m.subject || "(no subject)"}
                </div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>
                  {new Date(m.created_at).toLocaleString()} • from {m.created_by_user_id.slice(0, 8)}…
                  {m.alliance_code ? ` • alliance ${m.alliance_code}` : ""}{m.state_code ? ` • state ${m.state_code}` : ""}
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
