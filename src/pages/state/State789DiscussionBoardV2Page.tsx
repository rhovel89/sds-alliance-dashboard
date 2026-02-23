import React, { useMemo, useState } from "react";

const POSTS_KEY = "sad_state_789_discussion_v1";
const META_KEY = "sad_state_789_discussion_v1_meta_v1";

type AnyPost = any;

type MetaStore = {
  version: 1;
  updatedAt: string;
  pinnedKeys: string[];
  tagsByKey: Record<string, string[]>;
};

function nowIso() {
  return new Date().toISOString();
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveMeta(meta: MetaStore) {
  const raw = JSON.stringify(meta, null, 2);
  localStorage.setItem(META_KEY, raw);
  try {
    // eslint-disable-next-line no-new
    const ev = new StorageEvent("storage", { key: META_KEY, newValue: raw });
    window.dispatchEvent(ev);
  } catch {
    window.dispatchEvent(new CustomEvent("sad:localstorage", { detail: { key: META_KEY, newValue: raw } }));
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

function getPostKey(p: AnyPost, idx: number): string {
  const maybe = p?.id ?? p?.post_id ?? p?.key ?? p?.uuid ?? null;
  if (maybe) return String(maybe);
  return String(idx); // stable if list order is stable
}

function formatPostPreview(p: AnyPost): { title: string; body: string; author: string; at: string } {
  const author = String(p?.author ?? p?.user ?? p?.from ?? "Unknown");
  const at = String(p?.at ?? p?.created_at ?? p?.time ?? "");
  const title = String(p?.title ?? p?.subject ?? "").trim();

  const body =
    (typeof p?.body === "string" && p.body) ||
    (typeof p?.text === "string" && p.text) ||
    (typeof p?.message === "string" && p.message) ||
    (typeof p === "string" ? p : JSON.stringify(p, null, 2));

  return { title: title || "Post", body, author, at };
}

export default function State789DiscussionBoardV2Page() {
  const postsRaw = localStorage.getItem(POSTS_KEY);
  const posts = useMemo(() => {
    const parsed = safeJsonParse<any>(postsRaw, null);
    if (Array.isArray(parsed)) return parsed as AnyPost[];
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as any).posts)) return (parsed as any).posts as AnyPost[];
    return [] as AnyPost[];
  }, [postsRaw]);

  const [meta, setMeta] = useState<MetaStore>(() => {
    const m = safeJsonParse<MetaStore>(localStorage.getItem(META_KEY), {
      version: 1,
      updatedAt: nowIso(),
      pinnedKeys: [],
      tagsByKey: {},
    });
    return m;
  });

  const [tagFilter, setTagFilter] = useState<string>("");
  const [showPinnedOnly, setShowPinnedOnly] = useState<boolean>(false);

  function persist(next: MetaStore) {
    const withTs: MetaStore = { ...next, updatedAt: nowIso() };
    setMeta(withTs);
    saveMeta(withTs);
  }

  function togglePin(postKey: string) {
    const isPinned = meta.pinnedKeys.includes(postKey);
    const nextPins = isPinned ? meta.pinnedKeys.filter((k) => k !== postKey) : [postKey, ...meta.pinnedKeys];
    persist({ ...meta, pinnedKeys: nextPins });
  }

  function addTag(postKey: string) {
    const t = prompt("Add tag (no spaces recommended):")?.trim();
    if (!t) return;
    const cur = meta.tagsByKey[postKey] ?? [];
    if (cur.includes(t)) return;
    persist({ ...meta, tagsByKey: { ...meta.tagsByKey, [postKey]: [...cur, t].slice(0, 20) } });
  }

  function removeTag(postKey: string, tag: string) {
    const cur = meta.tagsByKey[postKey] ?? [];
    const next = cur.filter((x) => x !== tag);
    persist({ ...meta, tagsByKey: { ...meta.tagsByKey, [postKey]: next } });
  }

  function exportBundle() {
    const bundle = {
      exportedAt: nowIso(),
      postsKey: POSTS_KEY,
      metaKey: META_KEY,
      posts: safeJsonParse<any>(localStorage.getItem(POSTS_KEY), []),
      meta,
    };
    const raw = JSON.stringify(bundle, null, 2);
    downloadText("state-789-discussion-bundle.json", raw);
  }

  function importMeta(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      try {
        const obj = JSON.parse(text);
        const incoming = obj?.meta ?? obj;
        if (!incoming || incoming.version !== 1) throw new Error("Unexpected format (expected meta version: 1).");
        persist(incoming as MetaStore);
      } catch (e: any) {
        alert("Import failed: " + String(e?.message ?? e));
      }
    };
    reader.readAsText(file);
  }

  const normalized = useMemo(() => {
    return posts.map((p, idx) => {
      const key = getPostKey(p, idx);
      const preview = formatPostPreview(p);
      const tags = meta.tagsByKey[key] ?? [];
      const pinned = meta.pinnedKeys.includes(key);
      return { key, p, preview, tags, pinned, idx };
    });
  }, [posts, meta]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    Object.values(meta.tagsByKey).forEach((arr) => (arr ?? []).forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [meta]);

  const filtered = useMemo(() => {
    return normalized.filter((x) => {
      if (showPinnedOnly && !x.pinned) return false;
      if (tagFilter.trim()) {
        return x.tags.includes(tagFilter.trim());
      }
      return true;
    });
  }, [normalized, tagFilter, showPinnedOnly]);

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>State 789 Discussion (V2)</h1>
      <p style={{ opacity: 0.8, marginTop: 6 }}>
        Reads posts from <code>{POSTS_KEY}</code>. Stores tags/pins in <code>{META_KEY}</code> (separate key — safe).
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <button onClick={exportBundle}>Export Bundle</button>
        <label>
          <input
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importMeta(f);
              e.currentTarget.value = "";
            }}
          />
          <span style={{ cursor: "pointer", padding: "6px 10px", border: "1px solid #666", borderRadius: 6 }}>
            Import Meta
          </span>
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={showPinnedOnly} onChange={(e) => setShowPinnedOnly(e.target.checked)} />
          Pinned only
        </label>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ opacity: 0.8 }}>Tag filter</span>
          <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} style={{ minWidth: 220 }}>
            <option value="">(none)</option>
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

      {filtered.length === 0 ? (
        <div style={{ padding: 12, border: "1px dashed #666", borderRadius: 10, opacity: 0.8 }}>
          No posts match your current filter (or no posts found).
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map((x) => (
            <div key={x.key} style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
              <div
                style={{
                  padding: 12,
                  borderBottom: "1px solid #333",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 800 }}>
                    {x.pinned ? "📌 " : ""}
                    {x.preview.title}
                  </div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>
                      {x.preview.author} {x.preview.at ? "• " + x.preview.at : ""}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button onClick={() => togglePin(x.key)}>{x.pinned ? "Unpin" : "Pin"}</button>
                  <button onClick={() => addTag(x.key)}>+ Tag</button>
                </div>
              </div>

              <div style={{ padding: 12 }}>
                {x.tags.length ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                    {x.tags.map((t) => (
                      <span
                        key={t}
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
                        <span>{t}</span>
                        <button onClick={() => removeTag(x.key, t)} title="Remove tag">
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}

                <div style={{ whiteSpace: "pre-wrap" }}>{x.preview.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p style={{ marginTop: 12, opacity: 0.7, fontSize: 12 }}>
        V2 is additive and safe: it doesn’t rewrite your existing posts storage. It only stores tags/pins separately.
      </p>
    </div>
  );
}
