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
  const [store, setStore] = useState<MailStore>(() => safeJsonParse<MailStore>(localStorage.getItem(LS_MAIL), emptyStore()));
  const [selectedThreadId, setSelectedThreadId] = useState<string>(() => store.threads[0]?.id ?? "");
  const [draftAuthor, setDraftAuthor] = useState<string>("Me");
  const [draftBody, setDraftBody] = useState<string>("");

  const selectedThread = useMemo(() => store.threads.find((t) => t.id === selectedThreadId) ?? null, [store, selectedThreadId]);

  function persist(next: MailStore) {
    const withTs: MailStore = { ...next, updatedAt: nowIso() };
    setStore(withTs);
    saveStore(withTs);
  }

  function createThread() {
    const title = prompt("Thread title:")?.trim();
    if (!title) return;

    const t: Thread = { id: uid("thread"), title, updatedAt: nowIso(), messages: [] };
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
        persist(obj as MailStore);
        setSelectedThreadId((obj.threads[0]?.id ?? "") as string);
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
        Stored in <code>{LS_MAIL}</code>. No Supabase yet — export/import included.
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
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16 }}>
        {/* Threads */}
        <div style={{ border: "1px solid #333", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 700 }}>Threads</div>
          <div style={{ maxHeight: 520, overflowY: "auto" }}>
            {store.threads.length === 0 ? (
              <div style={{ padding: 12, opacity: 0.7 }}>No threads yet. Create one.</div>
            ) : (
              store.threads.map((t) => (
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
                  <div style={{ fontWeight: 700 }}>{t.title}</div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>
                    {t.messages.length} msg • {new Date(t.updatedAt).toLocaleString()}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
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
            <div style={{ fontWeight: 700 }}>{selectedThread ? selectedThread.title : "Select a thread"}</div>
          </div>

          <div style={{ padding: 12, maxHeight: 420, overflowY: "auto" }}>
            {!selectedThread ? (
              <div style={{ opacity: 0.7 }}>Choose a thread from the left.</div>
            ) : selectedThread.messages.length === 0 ? (
              <div style={{ opacity: 0.7 }}>No messages yet.</div>
            ) : (
              selectedThread.messages.map((m) => (
                <div key={m.id} style={{ padding: 10, border: "1px solid #222", borderRadius: 8, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 700 }}>{m.author}</div>
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
