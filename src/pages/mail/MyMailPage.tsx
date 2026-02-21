import React, { useEffect, useMemo, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type Msg = {
  id: string;
  tsUtc: string;
  author: string;
  body: string;
};

type Thread = {
  id: string;
  createdUtc: string;
  updatedUtc: string;
  title: string;
  tags: string[];
  pinned: boolean;
  messages: Msg[];
};

type Store = {
  version: 1;
  updatedUtc: string;
  threads: Thread[];
};

const KEY = "sad_my_mail_v1";

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}
function nowUtc() {
  return new Date().toISOString();
}
function safeJson(raw: string | null): any {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
function loadStore(): Store {
  const p = safeJson(localStorage.getItem(KEY));
  if (p && p.version === 1 && Array.isArray(p.threads)) return p as Store;
  return { version: 1, updatedUtc: nowUtc(), threads: [] };
}
function saveStore(s: Store) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...s, updatedUtc: nowUtc() })); } catch {}
}
function parseTags(csv: string): string[] {
  const a = (csv || "").split(",").map((x) => x.trim()).filter(Boolean).map((x) => x.replace(/^#/, ""));
  return Array.from(new Set(a));
}

export default function MyMailPage() {
  const [store, setStore] = useState<Store>(() => loadStore());
  useEffect(() => saveStore(store), [store]);

  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const threads = useMemo(() => {
    const s = (q || "").trim().toLowerCase();
    let arr = (store.threads || []).slice();

    if (s) {
      arr = arr.filter((t) => {
        const hay =
          `${t.title} ${(t.tags || []).join(" ")} ${(t.messages || []).map((m) => m.body).join(" ")}`.toLowerCase();
        return hay.includes(s);
      });
    }

    arr.sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return String(b.updatedUtc).localeCompare(String(a.updatedUtc));
    });

    return arr;
  }, [store.threads, q]);

  const selected = useMemo(
    () => (selectedId ? (store.threads || []).find((t) => t.id === selectedId) || null : null),
    [store.threads, selectedId]
  );

  const [title, setTitle] = useState("");
  const [tagsCsv, setTagsCsv] = useState("");
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!selected) return;
    setTitle(selected.title || "");
    setTagsCsv((selected.tags || []).join(","));
    setDraft("");
  }, [selectedId]);

  function newThread() {
    setSelectedId(null);
    setTitle("");
    setTagsCsv("");
    setDraft("");
  }

  function saveThreadMeta() {
    const t = (title || "").trim();
    if (!t) return alert("Title required.");
    const now = nowUtc();

    if (!selected) {
      const thr: Thread = {
        id: uid(),
        createdUtc: now,
        updatedUtc: now,
        title: t,
        tags: parseTags(tagsCsv),
        pinned: false,
        messages: [],
      };
      setStore((p) => ({ version: 1, updatedUtc: now, threads: [thr, ...(p.threads || [])] }));
      setSelectedId(thr.id);
      return;
    }

    setStore((p) => ({
      version: 1,
      updatedUtc: now,
      threads: (p.threads || []).map((x) =>
        x.id === selected.id
          ? { ...x, title: t, tags: parseTags(tagsCsv), updatedUtc: now }
          : x
      ),
    }));
  }

  function togglePin(id: string) {
    const now = nowUtc();
    setStore((p) => ({
      version: 1,
      updatedUtc: now,
      threads: (p.threads || []).map((x) => (x.id === id ? { ...x, pinned: !x.pinned, updatedUtc: now } : x)),
    }));
  }

  function deleteThread(id: string) {
    const thr = (store.threads || []).find((x) => x.id === id);
    if (!thr) return;
    if (!confirm(`Delete thread "${thr.title}"?`)) return;

    setStore((p) => ({ version: 1, updatedUtc: nowUtc(), threads: (p.threads || []).filter((x) => x.id !== id) }));
    if (selectedId === id) newThread();
  }

  function sendMessage() {
    if (!selected) return alert("Select or create a thread first.");
    const body = (draft || "").trim();
    if (!body) return;

    const now = nowUtc();
    const msg: Msg = { id: uid(), tsUtc: now, author: "Me", body };

    setStore((p) => ({
      version: 1,
      updatedUtc: now,
      threads: (p.threads || []).map((x) =>
        x.id === selected.id
          ? { ...x, updatedUtc: now, messages: [...(x.messages || []), msg] }
          : x
      ),
    }));

    setDraft("");
  }

  async function exportJson() {
    const txt = JSON.stringify({ ...store, exportedUtc: nowUtc() }, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied My Mail export JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  function importJson() {
    const raw = window.prompt("Paste My Mail export JSON:");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      if (!p || p.version !== 1 || !Array.isArray(p.threads)) throw new Error("Invalid");
      localStorage.setItem(KEY, JSON.stringify(p));
      setStore(loadStore());
      newThread();
      alert("Imported.");
    } catch {
      alert("Invalid JSON.");
    }
  }

  function clearAll() {
    if (!confirm("Clear ALL My Mail threads?")) return;
    try { localStorage.removeItem(KEY); } catch {}
    setStore(loadStore());
    newThread();
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>✉️ My Mail (UI shell)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={exportJson}>Export</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={importJson}>Import</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={clearAll}>Clear</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input className="zombie-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" style={{ padding: "10px 12px", minWidth: 240, flex: 1 }} />
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={newThread}>+ New Thread</button>
          <div style={{ marginLeft: "auto", opacity: 0.65, fontSize: 12 }}>
            localStorage: {KEY} • {threads.length} threads
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(360px, 1.2fr)", gap: 12 }}>
        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>Threads</div>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {threads.map((t) => {
              const sel = t.id === selectedId;
              const last = (t.messages || [])[t.messages.length - 1];
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  style={{
                    cursor: "pointer",
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: sel ? "rgba(120,255,120,0.08)" : "rgba(0,0,0,0.20)",
                  }}
                >
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ fontWeight: 900 }}>{t.pinned ? "📌 " : ""}{t.title}</div>
                    <div style={{ marginLeft: "auto", opacity: 0.65, fontSize: 12 }}>{t.updatedUtc}</div>
                  </div>
                  <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
                    {(t.tags || []).map((x) => "#" + x).join(" ")}
                  </div>
                  {last ? (
                    <div style={{ marginTop: 6, opacity: 0.7, fontSize: 12 }}>
                      {last.author}: {String(last.body || "").slice(0, 80)}{String(last.body || "").length > 80 ? "…" : ""}
                    </div>
                  ) : null}

                  <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={(ev) => { ev.stopPropagation(); togglePin(t.id); }}>
                      {t.pinned ? "Unpin" : "Pin"}
                    </button>
                    <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={(ev) => { ev.stopPropagation(); deleteThread(t.id); }}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
            {threads.length === 0 ? <div style={{ opacity: 0.75 }}>No mail threads yet.</div> : null}
          </div>
        </div>

        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>{selected ? "Thread" : "New Thread"}</div>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            <div>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Title</div>
              <input className="zombie-input" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} />
            </div>

            <div>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Tags (comma)</div>
              <input className="zombie-input" value={tagsCsv} onChange={(e) => setTagsCsv(e.target.value)} placeholder="ops,war,recruit" style={{ width: "100%", padding: "10px 12px" }} />
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={saveThreadMeta}>
                {selected ? "Save Thread" : "Create Thread"}
              </button>
            </div>

            {selected ? (
              <>
                <div style={{ marginTop: 6, fontWeight: 900 }}>Messages</div>
                <div style={{ display: "grid", gap: 8, maxHeight: 280, overflow: "auto", paddingRight: 6 }}>
                  {(selected.messages || []).map((m) => (
                    <div key={m.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 900 }}>{m.author}</div>
                        <div style={{ marginLeft: "auto", opacity: 0.65, fontSize: 12 }}>{m.tsUtc}</div>
                      </div>
                      <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{m.body}</div>
                    </div>
                  ))}
                  {(selected.messages || []).length === 0 ? <div style={{ opacity: 0.75 }}>No messages yet.</div> : null}
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>New message</div>
                  <textarea className="zombie-input" value={draft} onChange={(e) => setDraft(e.target.value)} style={{ width: "100%", minHeight: 110, padding: "10px 12px" }} />
                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={sendMessage}>Send</button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ marginTop: 10, opacity: 0.75 }}>
                Create a thread to start messaging. (UI-only now; Supabase + RLS later.)
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}