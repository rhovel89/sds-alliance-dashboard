import React, { useEffect, useMemo, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type Achievement = {
  id: string;
  createdUtc: string;
  updatedUtc: string;
  pinned: boolean;
  title: string;
  category: string;
  progress: number; // 0..100
  notes: string;
};

type Store = { version: 1; items: Achievement[] };

const KEY = "sad_state789_achievements_v1";

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}
function nowUtc() {
  return new Date().toISOString();
}
function clamp(n: number) {
  if (!isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
}

function safeJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function loadStore(): Store {
  const s = safeJson<Store>(localStorage.getItem(KEY));
  if (s && s.version === 1 && Array.isArray(s.items)) return s;
  return { version: 1, items: [] };
}

function saveStore(s: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export default function State789AchievementsPage() {
  const [store, setStore] = useState<Store>(() => loadStore());
  useEffect(() => saveStore(store), [store]);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("State");
  const [progress, setProgress] = useState(0);
  const [notes, setNotes] = useState("");

  const sorted = useMemo(() => {
    const items = store.items || [];
    return [...items].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return String(b.updatedUtc).localeCompare(String(a.updatedUtc));
    });
  }, [store.items]);

  function create() {
    const t = title.trim();
    if (!t) return window.alert("Title required.");
    const item: Achievement = {
      id: uid(),
      createdUtc: nowUtc(),
      updatedUtc: nowUtc(),
      pinned: false,
      title: t,
      category: (category || "State").trim(),
      progress: clamp(progress),
      notes: notes || "",
    };
    setStore((p) => ({ ...p, items: [item, ...(p.items || [])] }));
    setTitle("");
    setNotes("");
    setProgress(0);
  }

  function update(id: string, patch: Partial<Achievement>) {
    setStore((p) => ({
      ...p,
      items: (p.items || []).map((x) => (x.id === id ? { ...x, ...patch, updatedUtc: nowUtc() } : x)),
    }));
  }

  function del(id: string) {
    if (!window.confirm("Delete achievement?")) return;
    setStore((p) => ({ ...p, items: (p.items || []).filter((x) => x.id !== id) }));
  }

  async function exportJson() {
    const txt = JSON.stringify({ ...store, exportedUtc: nowUtc() }, null, 2);
    try { await navigator.clipboard.writeText(txt); window.alert("Copied achievements export JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  function importJson() {
    const raw = window.prompt("Paste achievements export JSON:");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      if (!p || p.version !== 1 || !Array.isArray(p.items)) throw new Error("Invalid");
      setStore({ version: 1, items: p.items });
      window.alert("Imported.");
    } catch {
      window.alert("Invalid JSON.");
    }
  }

  async function copyDiscordSummary() {
    const lines: string[] = [];
    lines.push("🏆 **State 789 — Achievements Update**");
    for (const a of sorted.slice(0, 20)) {
      const pct = clamp(a.progress);
      lines.push(`- ${a.pinned ? "📌 " : ""}**${a.title}** (${a.category}) — ${pct}%`);
    }
    const txt = lines.join("\n");
    try { await navigator.clipboard.writeText(txt); window.alert("Copied Discord summary."); }
    catch { window.prompt("Copy:", txt); }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🏆 State 789 — Achievements Tracker (UI-only)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={exportJson}>Export</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={importJson}>Import</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={copyDiscordSummary}>Copy Discord Summary</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Add Achievement</div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Title</div>
            <input className="zombie-input" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Category</div>
              <input className="zombie-input" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} />
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Progress (0–100)</div>
              <input className="zombie-input" type="number" value={progress} onChange={(e) => setProgress(clamp(Number(e.target.value)))} style={{ width: "100%", padding: "10px 12px" }} />
            </div>
          </div>

          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Notes</div>
            <textarea className="zombie-input" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: "100%", minHeight: 100, padding: "10px 12px" }} />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={create}>Save</button>
          </div>
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Achievements</div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {sorted.map((a) => (
            <div key={a.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>{a.pinned ? "📌 " : ""}{a.title}</div>
                <div style={{ marginLeft: "auto", opacity: 0.65, fontSize: 12 }}>{a.updatedUtc}</div>
              </div>

              <div style={{ marginTop: 6, opacity: 0.8, fontSize: 12 }}>
                {a.category} • {clamp(a.progress)}%
              </div>

              <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ opacity: 0.75, fontSize: 12 }}>Progress</div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={clamp(a.progress)}
                  onChange={(e) => update(a.id, { progress: clamp(Number(e.target.value)) })}
                  style={{ flex: 1, minWidth: 200 }}
                />
                <div style={{ width: 50, textAlign: "right", opacity: 0.85 }}>{clamp(a.progress)}%</div>
              </div>

              {a.notes ? (
                <div style={{ marginTop: 8, opacity: 0.75, whiteSpace: "pre-wrap" }}>{a.notes}</div>
              ) : null}

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => update(a.id, { pinned: !a.pinned })}>{a.pinned ? "Unpin" : "Pin"}</button>
                <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => del(a.id)}>Delete</button>
              </div>
            </div>
          ))}
          {sorted.length === 0 ? <div style={{ opacity: 0.75 }}>No achievements yet.</div> : null}
        </div>
      </div>
    </div>
  );
}