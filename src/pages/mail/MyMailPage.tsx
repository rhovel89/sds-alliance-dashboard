import React, { useEffect, useMemo, useRef, useState } from "react";

const LS_MAIL = "sad_my_mail_v1";

type MailMessage = {
  id: string;
  author: "me" | "system";
  body: string;
  created_at: string;
};

type MailThread = {
  id: string;
  title: string;
  tag?: string;
  pinned?: boolean;
  unread?: boolean;
  created_at: string;
  updated_at: string;
  messages: MailMessage[];
};

type MailStore = {
  threads: MailThread[];
};

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function emptyStore(): MailStore {
  return { threads: [] };
}

function normalizeStore(store: MailStore): MailStore {
  return {
    threads: Array.isArray(store?.threads)
      ? store.threads.map((t) => ({
          id: String(t?.id || uid("thread")),
          title: String(t?.title || "Untitled Thread"),
          tag: t?.tag ? String(t.tag) : "",
          pinned: !!t?.pinned,
          unread: !!t?.unread,
          created_at: String(t?.created_at || nowIso()),
          updated_at: String(t?.updated_at || t?.created_at || nowIso()),
          messages: Array.isArray(t?.messages)
            ? t.messages.map((m) => ({
                id: String(m?.id || uid("msg")),
                author: m?.author === "system" ? "system" : "me",
                body: String(m?.body || ""),
                created_at: String(m?.created_at || nowIso()),
              }))
            : [],
        }))
      : [],
  };
}

function saveStore(next: MailStore) {
  const raw = JSON.stringify(next);
  localStorage.setItem(LS_MAIL, raw);
  try {
    const ev = new StorageEvent("storage", { key: LS_MAIL, newValue: raw });
    window.dispatchEvent(ev);
  } catch {
    try {
      window.dispatchEvent(new CustomEvent("sad:localstorage", { detail: { key: LS_MAIL, newValue: raw } }));
    } catch {}
  }
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function prettyDate(v: string) {
  try {
    return new Date(v).toLocaleString();
  } catch {
    return v;
  }
}

export default function MyMailPage() {
  const [store, setStore] = useState<MailStore>(() =>
    normalizeStore(safeJsonParse<MailStore>(localStorage.getItem(LS_MAIL), emptyStore()))
  );

  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newTag, setNewTag] = useState("");
  const [composeBody, setComposeBody] = useState("");

  const fileRef = useRef<HTMLInputElement | null>(null);

  function persist(next: MailStore) {
    const normalized = normalizeStore(next);
    setStore(normalized);
    saveStore(normalized);
  }

  useEffect(() => {
    function onStorage() {
      setStore(normalizeStore(safeJsonParse<MailStore>(localStorage.getItem(LS_MAIL), emptyStore())));
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener("sad:localstorage" as any, onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("sad:localstorage" as any, onStorage);
    };
  }, []);

  const filteredThreads = useMemo(() => {
    const needle = String(q || "").trim().toLowerCase();
    const base = [...store.threads].sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return String(b.updated_at || "").localeCompare(String(a.updated_at || ""));
    });

    if (!needle) return base;

    return base.filter((t) => {
      const hay =
        `${t.title} ${t.tag || ""} ${t.messages.map((m) => m.body).join(" ")}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [store.threads, q]);

  const selectedThread = useMemo(() => {
    return store.threads.find((t) => String(t.id) === String(selectedThreadId)) || filteredThreads[0] || null;
  }, [store.threads, selectedThreadId, filteredThreads]);

  useEffect(() => {
    if (!selectedThread && filteredThreads.length > 0) {
      setSelectedThreadId(String(filteredThreads[0].id));
    }
  }, [selectedThread, filteredThreads]);

  const summary = useMemo(() => {
    const totalThreads = store.threads.length;
    const pinned = store.threads.filter((t) => t.pinned).length;
    const unread = store.threads.filter((t) => t.unread).length;
    const messages = store.threads.reduce((sum, t) => sum + t.messages.length, 0);
    return { totalThreads, pinned, unread, messages };
  }, [store.threads]);

  function createThread() {
    const title = String(newTitle || "").trim();
    if (!title) {
      setStatus("Enter a thread title first.");
      return;
    }

    const body = String(composeBody || "").trim();
    const ts = nowIso();

    const thread: MailThread = {
      id: uid("thread"),
      title,
      tag: String(newTag || "").trim(),
      pinned: false,
      unread: false,
      created_at: ts,
      updated_at: ts,
      messages: body
        ? [
            {
              id: uid("msg"),
              author: "me",
              body,
              created_at: ts,
            },
          ]
        : [],
    };

    const next: MailStore = {
      ...store,
      threads: [thread, ...store.threads],
    };

    persist(next);
    setSelectedThreadId(thread.id);
    setNewTitle("");
    setNewTag("");
    setComposeBody("");
    setStatus("Thread created ✅");
  }

  function updateThread(id: string, patch: Partial<MailThread>) {
    persist({
      ...store,
      threads: store.threads.map((t) =>
        String(t.id) === String(id)
          ? { ...t, ...patch, updated_at: nowIso() }
          : t
      ),
    });
  }

  function togglePin(id: string) {
    const t = store.threads.find((x) => String(x.id) === String(id));
    if (!t) return;
    updateThread(id, { pinned: !t.pinned });
    setStatus(t.pinned ? "Thread unpinned." : "Thread pinned ✅");
  }

  function toggleUnread(id: string) {
    const t = store.threads.find((x) => String(x.id) === String(id));
    if (!t) return;
    updateThread(id, { unread: !t.unread });
    setStatus(t.unread ? "Thread marked read." : "Thread marked unread.");
  }

  function deleteThread(id: string) {
    if (!window.confirm("Delete this thread?")) return;

    const nextThreads = store.threads.filter((t) => String(t.id) !== String(id));
    persist({ ...store, threads: nextThreads });

    if (String(selectedThreadId) === String(id)) {
      setSelectedThreadId(nextThreads[0]?.id ? String(nextThreads[0].id) : "");
    }

    setStatus("Thread deleted ✅");
  }

  function addMessage() {
    if (!selectedThread) {
      setStatus("Select a thread first.");
      return;
    }

    const body = String(composeBody || "").trim();
    if (!body) {
      setStatus("Write a message first.");
      return;
    }

    const msg: MailMessage = {
      id: uid("msg"),
      author: "me",
      body,
      created_at: nowIso(),
    };

    persist({
      ...store,
      threads: store.threads.map((t) =>
        String(t.id) === String(selectedThread.id)
          ? {
              ...t,
              updated_at: nowIso(),
              unread: false,
              messages: [...t.messages, msg],
            }
          : t
      ),
    });

    setComposeBody("");
    setStatus("Message added ✅");
  }

  function exportMail() {
    downloadText(
      `my-mail-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`,
      JSON.stringify(store, null, 2)
    );
    setStatus("Mail export downloaded ✅");
  }

  function importMail(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result || "{}"));
        const normalized = normalizeStore(obj as MailStore);
        persist(normalized);
        setSelectedThreadId(normalized.threads[0]?.id ? String(normalized.threads[0].id) : "");
        setStatus("Mail import complete ✅");
      } catch {
        setStatus("Import failed. Invalid JSON.");
      }
    };
    reader.readAsText(file);
  }

  function resetAll() {
    if (!window.confirm("Reset all local mail data on this device?")) return;
    const next = emptyStore();
    persist(next);
    setSelectedThreadId("");
    setComposeBody("");
    setStatus("Mail reset ✅");
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: 16, display: "grid", gap: 12 }}>
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.04)",
          borderRadius: 16,
          padding: 16,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>✉️ My Mail</div>
          <div style={{ opacity: 0.75, marginTop: 4 }}>
            Cleaner UI shell for personal mail threads stored in localStorage.
          </div>
          <div style={{ opacity: 0.65, marginTop: 6, fontSize: 12 }}>
            Storage key: <code>{LS_MAIL}</code>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="zombie-btn" type="button" onClick={exportMail}>Export</button>
          <button
            className="zombie-btn"
            type="button"
            onClick={() => fileRef.current?.click()}
          >
            Import
          </button>
          <button className="zombie-btn" type="button" onClick={resetAll}>Reset</button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importMail(f);
              e.currentTarget.value = "";
            }}
          />
        </div>
      </div>

      {status ? (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 14,
            padding: 12,
          }}
        >
          {status}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 380px) minmax(0, 1fr)", gap: 12 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              borderRadius: 16,
              padding: 14,
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Compose</div>

            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>Thread title</div>
                <input
                  className="zombie-input"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Example: WOC planning notes"
                  style={{ width: "100%", padding: "10px 12px" }}
                />
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>Tag</div>
                <input
                  className="zombie-input"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="ops, reminder, intel..."
                  style={{ width: "100%", padding: "10px 12px" }}
                />
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>
                  {selectedThread ? "Message body (adds to selected thread)" : "Opening message"}
                </div>
                <textarea
                  className="zombie-input"
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  rows={7}
                  placeholder="Write your message..."
                  style={{ width: "100%", padding: "10px 12px", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="zombie-btn" type="button" onClick={createThread}>Create Thread</button>
                <button className="zombie-btn" type="button" onClick={addMessage} disabled={!selectedThread}>
                  Add Message
                </button>
              </div>
            </div>
          </div>

          <div
            style={{
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              borderRadius: 16,
              padding: 14,
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Mail Summary</div>
            <div style={{ display: "grid", gap: 8 }}>
              <div>Threads: <strong>{summary.totalThreads}</strong></div>
              <div>Pinned: <strong>{summary.pinned}</strong></div>
              <div>Unread: <strong>{summary.unread}</strong></div>
              <div>Messages: <strong>{summary.messages}</strong></div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              borderRadius: 16,
              padding: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <div style={{ fontWeight: 900 }}>Threads</div>
              <input
                className="zombie-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search threads..."
                style={{ minWidth: 240, padding: "10px 12px" }}
              />
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {filteredThreads.length === 0 ? (
                <div style={{ opacity: 0.7 }}>No mail threads yet.</div>
              ) : (
                filteredThreads.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      border: String(selectedThread?.id) === String(t.id)
                        ? "1px solid rgba(255,255,255,0.20)"
                        : "1px solid rgba(255,255,255,0.08)",
                      background: String(selectedThread?.id) === String(t.id)
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.16)",
                      borderRadius: 12,
                      padding: 10,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                      <button
                        className="zombie-btn"
                        type="button"
                        style={{ textAlign: "left", whiteSpace: "normal", flex: 1 }}
                        onClick={() => setSelectedThreadId(String(t.id))}
                      >
                        <div style={{ fontWeight: 900 }}>
                          {t.pinned ? "📌 " : ""}{t.title}
                        </div>
                        <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>
                          {t.tag ? `${t.tag} • ` : ""}{t.messages.length} message(s) • {prettyDate(t.updated_at)}
                        </div>
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      <button className="zombie-btn" type="button" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => setSelectedThreadId(String(t.id))}>Open</button>
                      <button className="zombie-btn" type="button" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => togglePin(t.id)}>
                        {t.pinned ? "Unpin" : "Pin"}
                      </button>
                      <button className="zombie-btn" type="button" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => toggleUnread(t.id)}>
                        {t.unread ? "Mark Read" : "Mark Unread"}
                      </button>
                      <button className="zombie-btn" type="button" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => deleteThread(t.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div
            style={{
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              borderRadius: 16,
              padding: 14,
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Thread Detail</div>

            {!selectedThread ? (
              <div style={{ opacity: 0.7 }}>Select a thread to view messages.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900 }}>{selectedThread.title}</div>
                  <div style={{ opacity: 0.72, marginTop: 4 }}>
                    {selectedThread.tag ? `${selectedThread.tag} • ` : ""}
                    Created {prettyDate(selectedThread.created_at)} • Updated {prettyDate(selectedThread.updated_at)}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {selectedThread.messages.length === 0 ? (
                    <div style={{ opacity: 0.7 }}>No messages in this thread yet.</div>
                  ) : (
                    selectedThread.messages.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          border: "1px solid rgba(255,255,255,0.08)",
                          background: m.author === "me" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.16)",
                          borderRadius: 12,
                          padding: 12,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                          <div style={{ fontWeight: 800 }}>{m.author === "me" ? "Me" : "System"}</div>
                          <div style={{ opacity: 0.65, fontSize: 12 }}>{prettyDate(m.created_at)}</div>
                        </div>
                        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.body}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
