import React, { useEffect, useMemo, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type Msg = {
  id: string;
  subject: string;
  body: string;
  tags: string;
  pinned: boolean;
  createdUtc: string;
  updatedUtc: string;
};

type Store = { version: 1; updatedUtc: string; threads: Msg[] };

const KEY = "sad_mail_threads_v1";

function uid() { return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16); }
function nowUtc() { return new Date().toISOString(); }

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { version: 1, updatedUtc: nowUtc(), threads: [] };
    const s = JSON.parse(raw) as Store;
    if (s && s.version === 1 && Array.isArray(s.threads)) return s;
  } catch {}
  return { version: 1, updatedUtc: nowUtc(), threads: [] };
}

function save(s: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export default function MyMailShellPage() {
  const [store, setStore] = useState<Store>(() => load());
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const editing = useMemo(() => (editId ? store.threads.find((t) => t.id === editId) || null : null), [editId, store.threads]);

  const [subject, setSubject] = useState("");
  const [tags, setTags] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => { save(store); }, [store]);

  useEffect(() => {
    if (!editing) { setSubject(""); setTags(""); setBody(""); return; }
    setSubject(editing.subject || "");
    setTags(editing.tags || "");
    setBody(editing.body || "");
  }, [editId]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const tt = tag.trim().toLowerCase();
    return (store.threads || [])
      .filter((t) => (tt ? (t.tags || "").toLowerCase().includes(tt) : true))
      .filter((t) => (qq ? (t.subject + " " + t.body).toLowerCase().includes(qq) : true))
      .sort((a, b) => (a.pinned === b.pinned ? (b.updatedUtc.localeCompare(a.updatedUtc)) : a.pinned ? -1 : 1));
  }, [store.threads, q, tag]);

  function newThread() {
    setEditId(null);
    setSubject("");
    setTags("");
    setBody("");
  }

  function upsert() {
    const s = subject.trim();
    if (!s) return alert("Subject required.");
    const next: Store = { ...store, updatedUtc: nowUtc(), threads: [...(store.threads || [])] };

    if (!editId) {
      const id = uid();
      next.threads.unshift({ id, subject: s, tags: tags.trim(), body: body.trim(), pinned: false, createdUtc: nowUtc(), updatedUtc: nowUtc() });
      setStore(next);
      setEditId(id);
      return;
    }

    next.threads = next.threads.map((t) =>
      t.id === editId ? { ...t, subject: s, tags: tags.trim(), body: body.trim(), updatedUtc: nowUtc() } : t
    );
    setStore(next);
  }

  function del(id: string) {
    if (!confirm("Delete this thread?")) return;
    const next: Store = { ...store, updatedUtc: nowUtc(), threads: (store.threads || []).filter((t) => t.id !== id) };
    setStore(next);
    if (editId === id) newThread();
  }

  function togglePin(id: string) {
    const next: Store = {
      ...store,
      updatedUtc: nowUtc(),
      threads: (store.threads || []).map((t) => (t.id === id ? { ...t, pinned: !t.pinned, updatedUtc: nowUtc() } : t)),
    };
    setStore(next);
  }

  async function exportJson() {
    const txt = JSON.stringify({ ...store, exportedUtc: nowUtc() }, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied export JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  function importJson() {
    const raw = window.prompt("Paste export JSON:");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      const arr = Array.isArray(p.threads) ? p.threads : [];
      const cleaned: Msg[] = arr
        .filter((x: any) => x && x.subject)
        .map((x: any) => ({
          id: String(x.id || uid()),
          subject: String(x.subject),
          body: String(x.body || ""),
          tags: String(x.tags || ""),
          pinned: !!x.pinned,
          createdUtc: String(x.createdUtc || nowUtc()),
          updatedUtc: String(x.updatedUtc || nowUtc()),
        }));
      setStore({ version: 1, updatedUtc: nowUtc(), threads: cleaned });
      setEditId(null);
      alert("Imported.");
    } catch {
      alert("Invalid JSON.");
    }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>✉️ My Mail (UI shell)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={exportJson}>Export</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={importJson}>Import</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input className="zombie-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" style={{ padding: "10px 12px", minWidth: 220 }} />
          <input className="zombie-input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Filter tag…" style={{ padding: "10px 12px", minWidth: 180 }} />
          <div style={{ opacity: 0.75, fontSize: 12 }}>Threads: {store.threads.length}</div>
          <div style={{ opacity: 0.75, fontSize: 12 }}>UTC: {store.updatedUtc}</div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(300px, 1fr) minmax(320px, 1.1fr)", gap: 12 }}>
        <div className="zombie-card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontWeight: 900 }}>Inbox</div>
            <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={newThread}>+ New</button>
          </div>

          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {filtered.map((t) => {
              const sel = t.id === editId;
              return (
                <div key={t.id}
                  onClick={() => setEditId(t.id)}
                  style={{
                    cursor: "pointer",
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: sel ? "rgba(120,255,120,0.10)" : "rgba(0,0,0,0.20)",
                  }}
                >
                  <div style={{ fontWeight: 900 }}>{t.pinned ? "📌 " : ""}{t.subject}</div>
                  {t.tags ? <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>Tags: {t.tags}</div> : null}
                  <div style={{ opacity: 0.6, fontSize: 11, marginTop: 6 }}>UTC: {t.updatedUtc}</div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={(ev) => { ev.stopPropagation(); togglePin(t.id); }}>
                      {t.pinned ? "Unpin" : "Pin"}
                    </button>
                    <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={(ev) => { ev.stopPropagation(); del(t.id); }}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 ? <div style={{ opacity: 0.75 }}>No threads.</div> : null}
          </div>
        </div>

        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>{editId ? "Edit Thread" : "New Thread"}</div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Subject</div>
            <input className="zombie-input" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} />
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Tags (comma-separated)</div>
            <input className="zombie-input" value={tags} onChange={(e) => setTags(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} />
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Body</div>
            <textarea className="zombie-input" value={body} onChange={(e) => setBody(e.target.value)} style={{ width: "100%", minHeight: 180, padding: "10px 12px" }} />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={upsert}>{editId ? "Save" : "Create"}</button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={newThread}>Clear</button>
          </div>

          <div style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>
            UI-only (localStorage). Later: Supabase + RLS + Realtime.
          </div>
        </div>
      </div>
    </div>
  );
}