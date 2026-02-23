import React, { useMemo, useState } from "react";

const LS_MAIL = "sad_my_mail_v1";

type Message = {
  id: string;
  at: string; // ISO
  author: string;
  body: string;
};

type Thread = {
  id: string;
  title: string;
  updatedAt: string;
  pinned?: boolean;
  tags?: string[];
  messages: Message[];
};

type MailStore = {
  version: 1;
  updatedAt: string;
  threads: Thread[];
};

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeStore(store: MailStore): MailStore {
  const threads = (store.threads ?? []).map((t) => ({
    ...t,
    pinned: !!t.pinned,
    tags: Array.isArray(t.tags) ? t.tags : [],
    messages: Array.isArray(t.messages) ? t.messages : [],
  }));
  return { ...store, threads };
}

function saveStore(next: MailStore) {
  const raw = JSON.stringify(next, null, 2);
  localStorage.setItem(LS_MAIL, raw);
  try {
    // eslint-disable-next-line no-new
    const ev = new StorageEvent("storage", { key: LS_MAIL, newValue: raw });
    window.dispatchEvent(ev);
  } catch {
    window.dispatchEvent(new CustomEvent("sad:localstorage", { detail: { key: LS_MAIL, newValue: raw } }));
  }
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const emptyStore = (): MailStore => ({
  version: 1,
  updatedAt: nowIso(),
  threads: [],
});

export default function MyMailPage() {
  const [store, setStore] = useState<MailStore>(() =>
    normalizeStore(safeJsonParse<MailStore>(localStorage.getItem(LS_MAIL), emptyStore()))
  );

  const [selectedThreadId, setSelectedThreadId] = useState<string>(() => store.threads[0]?.id ?? "");
  const [draftAuthor, setDraftAuthor] = useState<string>("Me");
  const [draftBody, setDraftBody] = useState<string>("");

  const [search, setSearch] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<string>("");

  const selectedThread = useMemo(
    () => store.threads.find((t) => t.id === selectedThreadId) ?? null,
    [store, selectedThreadId]
  );

  const allTags = useMemo(() => {
    const s = new Set<string>();
    store.threads.forEach((t) => (t.tags ?? []).forEach((x) => s.add(x)));
    return Array.from(s).sort();
  }, [store]);

  function persist(next: MailStore) {
    const normalized = normalizeStore({ ...next, updatedAt: nowIso() });
    setStore(normalized);
    saveStore(normalized);
  }

  function createThread() {
    const title = prompt("Thread title:")?.trim();
    if (!title) return;

    const t: Thread = { id: uid("thread"), title, updatedAt: nowIso(), pinned: false, tags: [], messages: [] };
    const next: MailStore = { ...store, threads: [t, ...store.threads] };
    persist(next);
    setSelectedThreadId(t.id);
    setDraftBody("");
  }

  function renameThread(threadId: string) {
    const cur = store.threads.find((t) => t.id === threadId);
    if (!cur) return;
    const nextTitle = prompt("New title:", cur.title)?.trim();
    if (!nextTitle) return;

    const nextThreads = store.threads.map((t) => (t.id === threadId ? { ...t, title: nextTitle, updatedAt: nowIso() } : t));
    persist({ ...store, threads: nextThreads });
  }

  function togglePinThread(threadId: string) {
    const nextThreads = store.threads.map((t) => (t.id === threadId ? { ...t, pinned: !t.pinned, updatedAt: nowIso() } : t));
    persist({ ...store, threads: nextThreads });
  }

  function addTagThread(threadId: string) {
    const tag = prompt("Tag (no spaces recommended):")?.trim();
    if (!tag) return;
    const nextThreads = store.threads.map((t) => {
      if (t.id !== threadId) return t;
      const tags = Array.isArray(t.tags) ? t.tags : [];
      if (tags.includes(tag)) return t;
      return { ...t, tags: [...tags, tag].slice(0, 20), updatedAt: nowIso() };
    });
    persist({ ...store, threads: nextThreads });
  }

  function removeTagThread(threadId: string, tag: string) {
    const nextThreads = store.threads.map((t) => {
      if (t.id !== threadId) return t;
      const tags = Array.isArray(t.tags) ? t.tags : [];
      return { ...t, tags: tags.filter((x) => x !== tag), updatedAt: nowIso() };
    });
    persist({ ...store, threads: nextThreads });
    if (tagFilter === tag) setTagFilter("");
  }

  function deleteThread(threadId: string) {
    const cur = store.threads.find((t) => t.id === threadId);
    if (!cur) return;
    const ok = confirm(`Delete thread "${cur.title}"?`);
    if (!ok) return;

    const nextThreads = store.threads.filter((t) => t.id !== threadId);
    persist({ ...store, threads: nextThreads });

    if (selectedThreadId === threadId) {
      setSelectedThreadId(nextThreads[0]?.id ?? "");
      setDraftBody("");
    }
  }

  function sendMessage() {
    if (!selectedThread) return;
    const body = draftBody.trim();
    if (!body) return;

    const msg: Message = { id: uid("msg"), at: nowIso(), author: draftAuthor.trim() || "Me", body };
    const nextThreads = store.threads.map((t) =>
      t.id === selectedThread.id
        ? { ...t, updatedAt: nowIso(), messages: [...t.messages, msg] }
        : t
    );

    persist({ ...store, threads: nextThreads });
    setDraftBody("");
  }

  const visibleThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    const threads = [...store.threads];

    const filtered = threads.filter((t) => {
      if (tagFilter && !(t.tags ?? []).includes(tagFilter)) return false;
      if (!q) return true;

      const inTitle = t.title.toLowerCase().includes(q);
      if (inTitle) return true;

      return (t.messages ?? []).some((m) => (`${m.author} ${m.body}`).toLowerCase().includes(q));
    });

    // pinned first, then updatedAt desc
    filtered.sort((a, b) => {
      const ap = a.pinned ? 1 : 0;
      const bp = b.pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
    });

    return filtered;
  }, [store, search, tagFilter]);

  function exportMail() {
    const raw = JSON.stringify(store, null, 2);
    downloadText(`my-mail-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`, raw);
  }

  function importMail(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      try {
        const obj = JSON.parse(text);
        if (!obj || obj.version !== 1 || !Array.isArray(obj.threads)) throw new Error("Unexpected format (expected version: 1).");
        const normalized = normalizeStore(obj as MailStore);
        persist(normalized);
        setSelectedThreadId(normalized.threads[0]?.id ?? "");
        setDraftBody("");
      } catch (e: any) {
        alert(`Import failed: ${String(e?.message ?? e)}`);
      }
    };
    reader.readAsText(file);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>My Mail (UI shell)</h1>
      <p style={{ opacity: 0.8, marginTop: 6 }}>
        Stored in <code>{LS_MAIL}</code>. Enhancements: pin threads, tags, search, tag filter, export/import.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <button onClick={createThread}>+ New Thread</button>
        <button onClick={exportMail}>Export</button>
        <label>
          <input
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importMail(f);
              e.currentTarget.value = "";
            }}
          />
          <span style={{ cursor: "pointer", padding: "6px 10px", border: "1px solid #666", borderRadius: 6 }}>
            Import
          </span>
        </label>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ opacity: 0.8 }}>Search</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="title / author / text…" />
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ opacity: 0.8 }}>Tag</span>
          <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} style={{ minWidth: 200 }}>
            <option value="">(all)</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {tagFilter ? <button onClick={() => setTagFilter("")}>Clear</button> : null}
        </div>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
        {/* Threads */}
        <div style={{ border: "1px solid #333", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 700 }}>
            Threads ({visibleThreads.length})
          </div>
          <div style={{ maxHeight: 560, overflowY: "auto" }}>
            {visibleThreads.length === 0 ? (
              <div style={{ padding: 12, opacity: 0.7 }}>No threads match your filters.</div>
            ) : (
              visibleThreads.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedThreadId(t.id)}
                  style={{
                    padding: 12,
                    cursor: "pointer",
                    borderBottom: "1px solid #222",
                    background: t.id === selectedThreadId ? "rgba(255,255,255,0.06)" : "transparent",
                  }}
                >
                  <div style={{ fontWeight: 800 }}>
                    {t.pinned ? "📌 " : ""}
                    {t.title}
                  </div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>
                    {(t.messages ?? []).length} msg • {new Date(t.updatedAt).toLocaleString()}
                  </div>

                  {(t.tags ?? []).length ? (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      {(t.tags ?? []).map((tag) => (
                        <span
                          key={tag}
                          style={{
                            border: "1px solid #444",
                            borderRadius: 999,
                            padding: "2px 8px",
                            fontSize: 12,
                            opacity: 0.9,
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePinThread(t.id);
                      }}
                    >
                      {t.pinned ? "Unpin" : "Pin"}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addTagThread(t.id);
                      }}
                    >
                      + Tag
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        renameThread(t.id);
                      }}
                    >
                      Rename
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteThread(t.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Messages */}
        <div style={{ border: "1px solid #333", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: 12, borderBottom: "1px solid #333" }}>
            <div style={{ fontWeight: 800 }}>{selectedThread ? selectedThread.title : "Select a thread"}</div>
            {selectedThread && (selectedThread.tags ?? []).length ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {(selectedThread.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    style={{
                      border: "1px solid #444",
                      borderRadius: 999,
                      padding: "4px 10px",
                      fontSize: 12,
                      display: "inline-flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <span>{tag}</span>
                    <button onClick={() => removeTagThread(selectedThread.id, tag)} title="Remove tag">
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div style={{ padding: 12, maxHeight: 420, overflowY: "auto" }}>
            {!selectedThread ? (
              <div style={{ opacity: 0.7 }}>Choose a thread from the left.</div>
            ) : (selectedThread.messages ?? []).length === 0 ? (
              <div style={{ opacity: 0.7 }}>No messages yet.</div>
            ) : (
              (selectedThread.messages ?? []).map((m) => (
                <div key={m.id} style={{ padding: 10, border: "1px solid #222", borderRadius: 8, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 800 }}>{m.author}</div>
                    <div style={{ opacity: 0.7, fontSize: 12 }}>{new Date(m.at).toLocaleString()}</div>
                  </div>
                  <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{m.body}</div>
                </div>
              ))
            )}
          </div>

          <div style={{ padding: 12, borderTop: "1px solid #333", display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ opacity: 0.8 }}>Author</label>
              <input value={draftAuthor} onChange={(e) => setDraftAuthor(e.target.value)} style={{ minWidth: 220 }} />
            </div>

            <textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              rows={4}
              placeholder={selectedThread ? "Write a message…" : "Select a thread first…"}
              disabled={!selectedThread}
              style={{ width: "100%", fontFamily: "inherit" }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={sendMessage} disabled={!selectedThread || !draftBody.trim()}>
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      <p style={{ marginTop: 12, opacity: 0.7, fontSize: 12 }}>
        Later: replace localStorage store with Supabase threads/messages + RLS. For now, this is a safe UI shell.
      </p>
    </div>
  );
}
