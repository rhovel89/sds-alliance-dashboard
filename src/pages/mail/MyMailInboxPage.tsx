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

  sender_display_name?: string | null;

  direction?: "in" | "out" | null;
  peer_user_id?: string | null;
  peer_display_name?: string | null;

  direct_to_user_ids?: string[] | null;
};

type Player = { id: string; name: string | null; game_name: string | null };

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

  // direct compose
  const [toUserId, setToUserId] = useState("");
  const [toLabel, setToLabel] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // recipient search
  const [playerQuery, setPlayerQuery] = useState("");
  const [playerResults, setPlayerResults] = useState<Player[]>([]);
  const [linkMap, setLinkMap] = useState<Record<string, string>>({}); // player_id -> user_id
  const [searchingPlayers, setSearchingPlayers] = useState(false);

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

  async function searchPlayers() {
    const qq = playerQuery.trim();
    if (!qq) return;

    setSearchingPlayers(true);
    setStatus("Searching players…");

    const pRes = await supabase
      .from("players")
      .select("id,name,game_name")
      .or(`name.ilike.%${qq}%,game_name.ilike.%${qq}%`)
      .limit(20);

    if (pRes.error) {
      setStatus(pRes.error.message);
      setSearchingPlayers(false);
      return;
    }

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
    setSearchingPlayers(false);
  }

  function pickRecipient(p: Player) {
    const uid = linkMap[p.id];
    if (!uid) {
      alert("That player is not linked to an auth user yet (player_auth_links missing).");
      return;
    }
    setToUserId(uid);
    setToLabel(`${p.name ?? "Player"}${p.game_name ? " • " + p.game_name : ""}`);
  }

  async function sendDirect() {
    const to = toUserId.trim();
    const b = body.trim();
    if (!to || !b) return alert("Recipient and body are required.");

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
    setToLabel("");
    setSubject("");
    setBody("");
    setPlayerQuery("");
    setPlayerResults([]);
    setLinkMap({});

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

  function lineWho(m: MailItem) {
    const sender = m.sender_display_name || m.created_by_user_id.slice(0, 8) + "…";
    if (m.kind !== "direct") return `From: ${sender}`;
    if (m.direction === "out") return `To: ${m.peer_display_name || (m.peer_user_id ? m.peer_user_id.slice(0, 8) + "…" : "(unknown)")}`;
    return `From: ${sender}`;
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>My Mail (Supabase)</h1>
      <div style={{ opacity: 0.8, marginTop: 6 }}>
        {userId ? "Signed in ✅" : "Not signed in"}
        {loading ? " • Loading…" : ""}
        {status ? " • " + status : ""}
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
        <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>Send Direct Message</div>
        <div style={{ padding: 12, display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ opacity: 0.75, fontSize: 12 }}>Find player</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  value={playerQuery}
                  onChange={(e) => setPlayerQuery(e.target.value)}
                  placeholder="Search player name…"
                  style={{ flex: "1 1 240px" }}
                />
                <button disabled={!userId || searchingPlayers} onClick={searchPlayers}>Search</button>
              </div>

              {playerResults.length ? (
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {playerResults.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        border: "1px solid #222",
                        borderRadius: 10,
                        padding: 10,
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 900 }}>{p.name ?? "Player"}</div>
                        <div style={{ opacity: 0.75, fontSize: 12 }}>
                          {p.game_name ?? ""} • {p.id.slice(0, 8)}… {linkMap[p.id] ? "• linked ✅" : "• not linked"}
                        </div>
                      </div>
                      <button onClick={() => pickRecipient(p)} disabled={!linkMap[p.id]}>
                        Choose
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <div style={{ opacity: 0.75, fontSize: 12 }}>Recipient</div>
              <input value={toLabel} onChange={(e) => setToLabel(e.target.value)} placeholder="Chosen player (auto)..." />
              <div style={{ opacity: 0.6, fontSize: 12, marginTop: 6 }}>
                Internal user_id: <code>{toUserId ? toUserId : "(none)"}</code>
              </div>
            </div>
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
            <div
              style={{
                padding: 12,
                borderBottom: "1px solid #333",
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: 900 }}>
                  {m.pinned ? "📌 " : ""}[{m.kind}] {m.subject || "(no subject)"}
                </div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>
                  {new Date(m.created_at).toLocaleString()} • {lineWho(m)}
                  {m.alliance_code ? ` • alliance ${m.alliance_code}` : ""}
                  {m.state_code ? ` • state ${m.state_code}` : ""}
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
