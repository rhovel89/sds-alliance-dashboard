import React, { useEffect, useMemo, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type Thread = { id: string; title: string; body: string; tags: string; pinned: boolean; createdUtc: string };
const KEY = "sad_state789_discussion_v1";

function uid() { return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16); }
function nowUtc() { return new Date().toISOString(); }
function load(): Thread[] { try { const raw = localStorage.getItem(KEY); if (!raw) return []; const a = JSON.parse(raw); return Array.isArray(a) ? a : []; } catch { return []; } }
function save(v: Thread[]) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} }

export default function State789DiscussionBoardPage() {
  const [rows, setRows] = useState<Thread[]>(() => load());
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => save(rows), [rows]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const tt = tag.trim().toLowerCase();
    return (rows || [])
      .filter((x) => (tt ? (x.tags || "").toLowerCase().includes(tt) : true))
      .filter((x) => (qq ? (x.title + " " + x.body).toLowerCase().includes(qq) : true))
      .sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
  }, [rows, q, tag]);

  function add() {
    if (!title.trim()) return alert("Title required.");
    setRows((p) => [{ id: uid(), title: title.trim(), body: body.trim(), tags: tags.trim(), pinned: false, createdUtc: nowUtc() }, ...(p || [])]);
    setTitle(""); setBody(""); setTags("");
  }

  function del(id: string) {
    if (!confirm("Delete this thread?")) return;
    setRows((p) => (p || []).filter((x) => x.id !== id));
  }

  function pin(id: string) {
    setRows((p) => (p || []).map((x) => (x.id === id ? { ...x, pinned: !x.pinned } : x)));
  }

  async function exportJson() {
    const txt = JSON.stringify({ version: 1, exportedUtc: nowUtc(), threads: rows }, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied export JSON."); } catch { window.prompt("Copy:", txt); }
  }

  function importJson() {
    const raw = window.prompt("Paste export JSON:");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      const arr = Array.isArray(p.threads) ? p.threads : [];
      const cleaned: Thread[] = arr.filter((x: any) => x && x.title).map((x: any) => ({
        id: String(x.id || uid()),
        title: String(x.title),
        body: String(x.body || ""),
        tags: String(x.tags || ""),
        pinned: !!x.pinned,
        createdUtc: String(x.createdUtc || nowUtc()),
      }));
      setRows(cleaned);
      alert("Imported.");
    } catch { alert("Invalid JSON."); }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>💬 State 789 Discussion (UI shell)</h2>
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
          <div style={{ opacity: 0.75, fontSize: 12 }}>Threads: {rows.length}</div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(300px, 1fr) minmax(320px, 1.1fr)", gap: 12 }}>
        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>Threads</div>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {filtered.map((t) => (
              <div key={t.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                <div style={{ fontWeight: 900 }}>{t.pinned ? "📌 " : ""}{t.title}</div>
                {t.tags ? <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>Tags: {t.tags}</div> : null}
                {t.body ? <div style={{ opacity: 0.85, fontSize: 13, marginTop: 8, whiteSpace: "pre-wrap" }}>{t.body}</div> : null}
                <div style={{ opacity: 0.6, fontSize: 11, marginTop: 8 }}>UTC: {t.createdUtc}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => pin(t.id)}>{t.pinned ? "Unpin" : "Pin"}</button>
                  <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => del(t.id)}>Delete</button>
                </div>
              </div>
            ))}
            {filtered.length === 0 ? <div style={{ opacity: 0.75 }}>No matches.</div> : null}
          </div>
        </div>

        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>New Thread</div>
          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Title</div>
            <input className="zombie-input" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} />
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Tags (comma-separated)</div>
            <input className="zombie-input" value={tags} onChange={(e) => setTags(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} />
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Body</div>
            <textarea className="zombie-input" value={body} onChange={(e) => setBody(e.target.value)} style={{ width: "100%", minHeight: 140, padding: "10px 12px" }} />
          </div>
          <button className="zombie-btn" style={{ marginTop: 12, padding: "10px 12px" }} onClick={add}>Post</button>
        </div>
      </div>
    </div>
  );
}