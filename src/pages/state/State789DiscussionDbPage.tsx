import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";

type Thread = {
  id: string;
  state_code: string;
  title: string;
  tags: string[];
  pinned: boolean;
  locked: boolean;
  last_post_at: string;
  created_at: string;
};

type Post = {
  id: string;
  thread_id: string;
  body: string;
  created_at: string;
  created_by_user_id: string;
};

function tagsFrom(raw: string) {
  return raw.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 20);
}

export default function State789DiscussionDbPage() {
  const stateCode = "789";

  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [status, setStatus] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newTags, setNewTags] = useState("");
  const [reply, setReply] = useState("");

  const [q, setQ] = useState("");
  const [onlyPinned, setOnlyPinned] = useState(false);

  async function loadThreads() {
    setStatus("Loading threads…");
    const res = await supabase
      .from("state_discussion_threads")
      .select("*")
      .eq("state_code", stateCode)
      .order("pinned", { ascending: false })
      .order("last_post_at", { ascending: false })
      .limit(200);

    if (res.error) { setStatus(res.error.message); return; }
    const list = (res.data ?? []) as any as Thread[];
    setThreads(list);
    setStatus("");

    if (!selectedId && list[0]?.id) setSelectedId(list[0].id);
  }

  async function loadPosts(threadId: string) {
    if (!threadId) { setPosts([]); return; }
    setStatus("Loading posts…");
    const res = await supabase
      .from("state_discussion_posts")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(500);

    if (res.error) { setStatus(res.error.message); return; }
    setPosts((res.data ?? []) as any);
    setStatus("");
  }

  useEffect(() => { void loadThreads(); }, []);
  useEffect(() => { void loadPosts(selectedId); }, [selectedId]);

  async function createThread() {
    const t = newTitle.trim();
    if (!t) return alert("Title required.");
    setStatus("Creating thread…");

    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id ?? "";
    if (!uid) return alert("Not signed in.");

    const ins = await supabase.from("state_discussion_threads").insert({
      state_code: stateCode,
      created_by_user_id: uid,
      title: t,
      tags: tagsFrom(newTags),
      pinned: false,
      locked: false,
      last_post_at: new Date().toISOString(),
    }).select("*").single();

    if (ins.error) { setStatus(ins.error.message); return; }

    setNewTitle(""); setNewTags("");
    await loadThreads();
    setSelectedId((ins.data as any).id);
    setStatus("Created ✅");
    window.setTimeout(() => setStatus(""), 1200);
  }

  async function postReply() {
    const b = reply.trim();
    if (!b) return;
    if (!selectedId) return;

    setStatus("Posting…");
    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id ?? "";
    if (!uid) return alert("Not signed in.");

    const ins = await supabase.from("state_discussion_posts").insert({
      thread_id: selectedId,
      state_code: stateCode,
      created_by_user_id: uid,
      body: b,
    });

    if (ins.error) { setStatus(ins.error.message); return; }
    setReply("");
    await loadPosts(selectedId);
    await loadThreads();
    setStatus("");
  }

  const filteredThreads = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return threads.filter((t) => {
      if (onlyPinned && !t.pinned) return false;
      if (!qq) return true;
      const hay = `${t.title} ${(t.tags ?? []).join(" ")}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [threads, q, onlyPinned]);

  const selected = threads.find((t) => t.id === selectedId) ?? null;

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>State 789 Discussion (DB)</h1>
      <div style={{ opacity: 0.8, marginTop: 6 }}>{status ? status : "Supabase-backed threads/posts"}</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginTop: 12 }}>
        <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>Threads</div>
          <div style={{ padding: 12, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search…" />
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={onlyPinned} onChange={(e) => setOnlyPinned(e.target.checked)} />
                pinned
              </label>
              <button onClick={loadThreads}>Reload</button>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {filteredThreads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  style={{
                    textAlign: "left",
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid #222",
                    opacity: selectedId === t.id ? 1 : 0.85,
                  }}
                >
                  <div style={{ fontWeight: 900 }}>{t.pinned ? "📌 " : ""}{t.title}</div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>
                    {new Date(t.last_post_at).toLocaleString()} • {(t.tags ?? []).join(", ")}
                    {t.locked ? " • 🔒" : ""}
                  </div>
                </button>
              ))}
              {filteredThreads.length === 0 ? <div style={{ opacity: 0.7 }}>No threads.</div> : null}
            </div>

            <hr style={{ opacity: 0.3 }} />

            <div style={{ fontWeight: 900 }}>New Thread</div>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Title…" />
            <input value={newTags} onChange={(e) => setNewTags(e.target.value)} placeholder="Tags (comma-separated)..." />
            <button onClick={createThread}>Create</button>
          </div>
        </div>

        <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>
            {selected ? selected.title : "Select a thread"}
          </div>
          <div style={{ padding: 12 }}>
            {selected ? (
              <>
                <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 10 }}>
                  {(selected.tags ?? []).length ? `Tags: ${(selected.tags ?? []).join(", ")}` : "No tags"}
                  {selected.locked ? " • 🔒 Locked" : ""}
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {posts.map((p) => (
                    <div key={p.id} style={{ border: "1px solid #222", borderRadius: 10, padding: 10 }}>
                      <div style={{ opacity: 0.75, fontSize: 12 }}>
                        {new Date(p.created_at).toLocaleString()} • {p.created_by_user_id.slice(0, 8)}…
                      </div>
                      <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{p.body}</div>
                    </div>
                  ))}
                  {posts.length === 0 ? <div style={{ opacity: 0.7 }}>No posts yet.</div> : null}
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 900 }}>Reply</div>
                  <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4} placeholder="Write a reply…" style={{ width: "100%" }} />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                    <button onClick={postReply} disabled={selected.locked}>Post</button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ opacity: 0.75 }}>Choose a thread on the left.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
