import React, { useMemo, useState } from "react";

const LS_ALERTS = "sad_state_789_alerts_v2";
const LS_OPERATOR = "sad_state_789_alerts_operator_v1";

type Severity = "info" | "warning" | "critical";

type AlertItem = {
  id: string;
  createdAt: string; // ISO
  createdBy: string;
  severity: Severity;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  acknowledgedBy: string[];
};

type Store = {
  version: 1;
  updatedAt: string;
  items: AlertItem[];
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

function saveStore(next: Store) {
  const raw = JSON.stringify(next, null, 2);
  localStorage.setItem(LS_ALERTS, raw);
  try {
    // eslint-disable-next-line no-new
    const ev = new StorageEvent("storage", { key: LS_ALERTS, newValue: raw });
    window.dispatchEvent(ev);
  } catch {
    window.dispatchEvent(new CustomEvent("sad:localstorage", { detail: { key: LS_ALERTS, newValue: raw } }));
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

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    alert("Copied to clipboard");
  } catch {
    alert("Copy failed (clipboard permission).");
  }
}

function normalizeTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function severityLabel(s: Severity) {
  if (s === "critical") return "CRITICAL";
  if (s === "warning") return "WARNING";
  return "INFO";
}

function discordMessage(a: AlertItem) {
  const sev = severityLabel(a.severity);
  const tags = a.tags.length ? `\nTags: ${a.tags.map((t) => `#${t}`).join(" ")}` : "";
  return `**[${sev}] ${a.title}**\n${a.body}${tags}`;
}

function defaultStore(): Store {
  return {
    version: 1,
    updatedAt: nowIso(),
    items: [],
  };
}

export default function State789AlertsCenterPage() {
  const [operator, setOperator] = useState<string>(() => localStorage.getItem(LS_OPERATOR) ?? "Me");
  const [store, setStore] = useState<Store>(() => safeJsonParse<Store>(localStorage.getItem(LS_ALERTS), defaultStore()));

  const [severity, setSeverity] = useState<Severity>("info");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");

  const [filterSeverity, setFilterSeverity] = useState<"" | Severity>("");
  const [filterTag, setFilterTag] = useState("");
  const [onlyPinned, setOnlyPinned] = useState(false);
  const [onlyUnacked, setOnlyUnacked] = useState(false);

  function persist(next: Store) {
    const withTs: Store = { ...next, updatedAt: nowIso() };
    setStore(withTs);
    saveStore(withTs);
  }

  function persistOperator(next: string) {
    setOperator(next);
    localStorage.setItem(LS_OPERATOR, next);
  }

  function addAlert() {
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) return alert("Title and Body are required.");

    const item: AlertItem = {
      id: uid("alert"),
      createdAt: nowIso(),
      createdBy: (operator || "Me").trim() || "Me",
      severity,
      title: t,
      body: b,
      tags: normalizeTags(tagsRaw),
      pinned: false,
      acknowledgedBy: [],
    };

    persist({ ...store, items: [item, ...(store.items ?? [])] });
    setTitle("");
    setBody("");
    setTagsRaw("");
  }

  function togglePinned(id: string) {
    persist({
      ...store,
      items: store.items.map((x) => (x.id === id ? { ...x, pinned: !x.pinned } : x)),
    });
  }

  function acknowledge(id: string) {
    const name = (operator || "Me").trim() || "Me";
    persist({
      ...store,
      items: store.items.map((x) => {
        if (x.id !== id) return x;
        const set = new Set(x.acknowledgedBy ?? []);
        if (set.has(name)) set.delete(name);
        else set.add(name);
        return { ...x, acknowledgedBy: Array.from(set).sort() };
      }),
    });
  }

  function removeAlert(id: string) {
    const ok = confirm("Delete this alert?");
    if (!ok) return;
    persist({ ...store, items: store.items.filter((x) => x.id !== id) });
  }

  function exportAll() {
    const raw = JSON.stringify(store, null, 2);
    downloadText(`state-789-alerts-v2-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`, raw);
  }

  function importAll(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      try {
        const obj = JSON.parse(text);
        if (!obj || obj.version !== 1 || !Array.isArray(obj.items)) throw new Error("Unexpected format (expected version: 1).");
        persist(obj as Store);
        alert("Import complete.");
      } catch (e: any) {
        alert("Import failed: " + String(e?.message ?? e));
      }
    };
    reader.readAsText(file);
  }

  const allTags = useMemo(() => {
    const s = new Set<string>();
    (store.items ?? []).forEach((a) => (a.tags ?? []).forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [store]);

  const filtered = useMemo(() => {
    const tag = filterTag.trim();
    return (store.items ?? []).filter((a) => {
      if (filterSeverity && a.severity !== filterSeverity) return false;
      if (onlyPinned && !a.pinned) return false;
      if (onlyUnacked && (a.acknowledgedBy ?? []).length > 0) return false;
      if (tag) return (a.tags ?? []).includes(tag);
      return true;
    });
  }, [store, filterSeverity, filterTag, onlyPinned, onlyUnacked]);

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>State 789 Alerts Center (V2)</h1>
      <p style={{ opacity: 0.8, marginTop: 6 }}>
        UI-only alerts timeline with tags/pins/ack/export/import. Storage key: <code>{LS_ALERTS}</code>
      </p>

      <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden", marginTop: 12 }}>
        <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 800 }}>Create Alert</div>
        <div style={{ padding: 12, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ opacity: 0.8 }}>Operator</label>
            <input value={operator} onChange={(e) => persistOperator(e.target.value)} style={{ minWidth: 220 }} />

            <label style={{ opacity: 0.8 }}>Severity</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
              <option value="info">info</option>
              <option value="warning">warning</option>
              <option value="critical">critical</option>
            </select>

            <button onClick={addAlert}>Post alert</button>
          </div>

          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title…" />

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Body…"
            style={{ width: "100%" }}
          />

          <input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="Tags (comma-separated)…" />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
        <button onClick={exportAll}>Export</button>
        <label>
          <input
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importAll(f);
              e.currentTarget.value = "";
            }}
          />
          <span style={{ cursor: "pointer", padding: "6px 10px", border: "1px solid #666", borderRadius: 6 }}>
            Import
          </span>
        </label>

        <span style={{ opacity: 0.7 }}>Filters:</span>

        <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value as any)}>
          <option value="">(any severity)</option>
          <option value="info">info</option>
          <option value="warning">warning</option>
          <option value="critical">critical</option>
        </select>

        <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
          <option value="">(any tag)</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={onlyPinned} onChange={(e) => setOnlyPinned(e.target.checked)} />
          pinned only
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={onlyUnacked} onChange={(e) => setOnlyUnacked(e.target.checked)} />
          unacked only
        </label>

        <div style={{ opacity: 0.7 }}>
          Showing <b>{filtered.length}</b> of <b>{store.items.length}</b>
        </div>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      <div style={{ display: "grid", gap: 12 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 12, border: "1px dashed #666", borderRadius: 10, opacity: 0.8 }}>
            No alerts match your filters.
          </div>
        ) : (
          filtered.map((a) => (
            <div key={a.id} style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
              <div
                style={{
                  padding: 12,
                  borderBottom: "1px solid #333",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontWeight: 900 }}>
                    {a.pinned ? "📌 " : ""}
                    [{severityLabel(a.severity)}] {a.title}
                  </div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>
                    {a.createdBy} • {new Date(a.createdAt).toLocaleString()}
                  </div>
                  {a.tags.length ? (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      {a.tags.map((t) => (
                        <span
                          key={t}
                          style={{
                            border: "1px solid #444",
                            borderRadius: 999,
                            padding: "2px 8px",
                            fontSize: 12,
                            opacity: 0.9,
                          }}
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => togglePinned(a.id)}>{a.pinned ? "Unpin" : "Pin"}</button>
                  <button onClick={() => acknowledge(a.id)}>
                    {(a.acknowledgedBy ?? []).includes((operator || "Me").trim() || "Me") ? "Unack" : "Ack"}
                  </button>
                  <button onClick={() => copyToClipboard(discordMessage(a))}>Copy Discord</button>
                  <button onClick={() => copyToClipboard(JSON.stringify(a, null, 2))}>Copy JSON</button>
                  <button onClick={() => removeAlert(a.id)}>Delete</button>
                </div>
              </div>

              <div style={{ padding: 12, whiteSpace: "pre-wrap" }}>{a.body}</div>

              <div style={{ padding: 12, borderTop: "1px solid #222", opacity: 0.8, fontSize: 12 }}>
                Acknowledged by: {(a.acknowledgedBy ?? []).length ? a.acknowledgedBy.join(", ") : "(none)"}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
