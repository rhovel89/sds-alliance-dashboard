import React, { useEffect, useMemo, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type Message = {
  id: string;
  createdUtc: string;
  fromLabel: string;
  body: string;
};

type Thread = {
  id: string;
  createdUtc: string;
  updatedUtc: string;
  title: string;
  toLabel: string;        // free text for now
  tags: string[];
  pinned: boolean;
  archived: boolean;
  messages: Message[];
};

type Store = {
  version: 1;
  updatedUtc: string;
  threads: Thread[];
};

const KEY = "sad_my_mail_v1";

function uid() { return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16); }
function nowUtc() { return new Date().toISOString(); }

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as any;
      if (p && p.version === 1 && Array.isArray(p.threads)) {
        return {
          version: 1,
          updatedUtc: String(p.updatedUtc || nowUtc()),
          threads: (p.threads as any[]).map((t) => ({
            id: String(t?.id || uid()),
            createdUtc: String(t?.createdUtc || nowUtc()),
            updatedUtc: String(t?.updatedUtc || nowUtc()),
            title: String(t?.title || "Untitled"),
            toLabel: String(t?.toLabel || ""),
            tags: Array.isArray(t?.tags) ? t.tags.map((x: any) => String(x)) : [],
            pinned: !!t?.pinned,
            archived: !!t?.archived,
            messages: Array.isArray(t?.messages)
              ? t.messages.map((m: any) => ({
                  id: String(m?.id || uid()),
                  createdUtc: String(m?.createdUtc || nowUtc()),
                  fromLabel: String(m?.fromLabel || "Me"),
                  body: String(m?.body || ""),
                }))
              : [],
          })),
        };
      }
    }
  } catch {}
  return { version: 1, updatedUtc: nowUtc(), threads: [] };
}

function saveStore(s: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export default function MyMailPage() {
  const [store, setStore] = useState<Store>(() => loadStore());
  useEffect(() => saveStore(store), [store]);

  const [view, setView] = useState<"inbox" | "archived">("inbox");
  const [search, setSearch] = useState("");

  const threads = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    let arr = (store.threads || []).slice();

    arr = arr.filter((t) => (view === "archived" ? t.archived : !t.archived));
    if (q) {
      arr = arr.filter((t) => {
        const hay =
          (t.title || "") + " " +
          (t.toLabel || "") + " " +
          (t.tags || []).join(" ") + " " +
          (t.messages || []).map((m) => m.body).join(" ");
        return hay.toLowerCase().includes(q);
      });
    }

    // pinned first, then updated desc
    arr.sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return String(b.updatedUtc).localeCompare(String(a.updatedUtc));
    });
    return arr;
  }, [store.threads, view, search]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => (selectedId ? (store.threads || []).find((t) => t.id === selectedId) || null : null), [selectedId, store.threads]);

  // Composer
  const [toLabel, setToLabel] = useState("");
  const [title, setTitle] = useState("");
  const [tagsCsv, setTagsCsv] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    // when selecting, load metadata into composer header (not body)
    if (!selected) return;
    setToLabel(selected.toLabel || "");
    setTitle(selected.title || "");
    setTagsCsv((selected.tags || []).join(","));
    setBody("");
  }, [selectedId]);

  function resetComposer() {
    setSelectedId(null);
    setToLabel("");
    setTitle("");
    setTagsCsv("");
    setBody("");
  }

  function upsertThread(withMessage: boolean) {
    const now = nowUtc();
    const tTitle = (title || "").trim() || "Untitled";
    const tTo = (toLabel || "").trim();
    const tTags = (tagsCsv || "").split(",").map((x) => x.trim()).filter(Boolean);

    const msgBody = (body || "").trim();
    const newMsg: Message | null = withMessage && msgBody
      ? { id: uid(), createdUtc: now, fromLabel: "Me", body: msgBody }
      : null;

    setStore((p) => {
      const next: Store = { version: 1, updatedUtc: now, threads: [...(p.threads || [])] };

      if (selectedId) {
        const idx = next.threads.findIndex((x) => x.id === selectedId);
        if (idx >= 0) {
          const cur = next.threads[idx];
          const msgs = newMsg ? [newMsg, ...(cur.messages || [])] : (cur.messages || []);
          next.threads[idx] = { ...cur, title: tTitle, toLabel: tTo, tags: tTags, messages: msgs, updatedUtc: now };
          return next;
        }
      }

      // create new
      const thr: Thread = {
        id: uid(),
        createdUtc: now,
        updatedUtc: now,
        title: tTitle,
        toLabel: tTo,
        tags: tTags,
        pinned: false,
        archived: false,
        messages: newMsg ? [newMsg] : [],
      };
      next.threads.unshift(thr);
      return next;
    });

    setBody("");
  }

  function deleteThread(id: string) {
    const thr = (store.threads || []).find((t) => t.id === id);
    if (!thr) return;
    if (!confirm(`Delete thread "${thr.title}"?`)) return;
    setStore((p) => ({ version: 1, updatedUtc: nowUtc(), threads: (p.threads || []).filter((t) => t.id !== id) }));
    if (selectedId === id) resetComposer();
  }

  function togglePin(id: string) {
    setStore((p) => ({
      version: 1,
      updatedUtc: nowUtc(),
      threads: (p.threads || []).map((t) => (t.id === id ? { ...t, pinned: !t.pinned, updatedUtc: nowUtc() } : t)),
    }));
  }

  function toggleArchive(id: string) {
    setStore((p) => ({
      version: 1,
      updatedUtc: nowUtc(),
      threads: (p.threads || []).map((t) => (t.id === id ? { ...t, archived: !t.archived, updatedUtc: nowUtc() } : t)),
    }));
  }

  async function exportJson() {
    const txt = JSON.stringify({ ...store, exportedUtc: nowUtc() }, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied My Mail JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  function importJson() {
    const raw = window.prompt("Paste My Mail JSON:");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      if (!p || p.version !== 1 || !Array.isArray(p.threads)) throw new Error("Invalid");
      setStore({ version: 1, updatedUtc: nowUtc(), threads: p.threads });
      resetComposer();
      alert("Imported.");
    } catch {
      alert("Invalid JSON.");
    }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>📬 My Mail (UI shell)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={exportJson}>Export</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={importJson}>Import</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px", opacity: view === "inbox" ? 1 : 0.7 }} onClick={() => setView("inbox")}>Inbox</button>
          <button className="zombie-btn" style={{ padding: "10px 12px", opacity: view === "archived" ? 1 : 0.7 }} onClick={() => setView("archived")}>Archived</button>

          <input
            className="zombie-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            style={{ padding: "10px 12px", minWidth: 240, flex: 1 }}
          />

          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={resetComposer}>+ New</button>
          <div style={{ opacity: 0.65, fontSize: 12, marginLeft: "auto" }}>
            localStorage: {KEY}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(360px, 1.2fr)", gap: 12 }}>
        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>Threads ({threads.length})</div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {threads.map((t) => {
              const sel = t.id === selectedId;
              const preview = (t.messages?.[0]?.body || "").slice(0, 90);
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
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900 }}>{t.pinned ? "📌 " : ""}{t.title}</div>
                    <div style={{ marginLeft: "auto", opacity: 0.65, fontSize: 12 }}>{t.updatedUtc}</div>
                  </div>
                  <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
                    To: {t.toLabel || "(unknown)"}{t.tags?.length ? " • " + t.tags.map((x) => "#" + x).join(" ") : ""}
                  </div>
                  {preview ? <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>{preview}{preview.length >= 90 ? "…" : ""}</div> : null}

                  <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={(ev) => { ev.stopPropagation(); togglePin(t.id); }}>
                      {t.pinned ? "Unpin" : "Pin"}
                    </button>
                    <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={(ev) => { ev.stopPropagation(); toggleArchive(t.id); }}>
                      {t.archived ? "Unarchive" : "Archive"}
                    </button>
                    <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={(ev) => { ev.stopPropagation(); deleteThread(t.id); }}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
            {threads.length === 0 ? <div style={{ opacity: 0.75 }}>No threads yet. Click “New”.</div> : null}
          </div>
        </div>

        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>{selected ? "Open Thread" : "New Thread"}</div>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            <div>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>To (free text for now)</div>
              <input className="zombie-input" value={toLabel} onChange={(e) => setToLabel(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} placeholder="Player / Alliance / Note" />
            </div>

            <div>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Title</div>
              <input className="zombie-input" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} placeholder="Subject" />
            </div>

            <div>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Tags (comma)</div>
              <input className="zombie-input" value={tagsCsv} onChange={(e) => setTagsCsv(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} placeholder="trade,leadership,ops" />
            </div>

            <div>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Message</div>
              <textarea className="zombie-input" value={body} onChange={(e) => setBody(e.target.value)} style={{ width: "100%", minHeight: 140, padding: "10px 12px" }} placeholder="Type message…" />
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => upsertThread(false)}>
                {selected ? "Save Meta" : "Create Thread"}
              </button>
              <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => upsertThread(true)}>
                Send Message
              </button>
              <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={resetComposer}>
                Clear
              </button>
            </div>
          </div>

          {selected ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Messages</div>
              <div style={{ display: "grid", gap: 8 }}>
                {(selected.messages || []).map((m) => (
                  <div key={m.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ fontWeight: 900 }}>{m.fromLabel}</div>
                      <div style={{ marginLeft: "auto", opacity: 0.65, fontSize: 12 }}>{m.createdUtc}</div>
                    </div>
                    <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{m.body}</div>
                  </div>
                ))}
                {(selected.messages || []).length === 0 ? <div style={{ opacity: 0.75 }}>No messages yet.</div> : null}
              </div>
            </div>
          ) : null}

          <div style={{ marginTop: 12, opacity: 0.65, fontSize: 12 }}>
            Next step later: move this store to Supabase + RLS + realtime + per-user inbox.
          </div>
        </div>
      </div>
    </div>
  );
}