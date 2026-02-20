import React, { useEffect, useMemo, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type Item = { id: string; name: string; durationMin: number; notes: string; createdUtc: string };
const KEY = "sad_event_types_library_v1";

function uid() { return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16); }
function nowUtc() { return new Date().toISOString(); }

function load(): Item[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function save(v: Item[]) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} }

export default function OwnerEventTypesLibraryPage() {
  const [items, setItems] = useState<Item[]>(() => load());
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [durationMin, setDurationMin] = useState(60);
  const [notes, setNotes] = useState("");

  useEffect(() => save(items), [items]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter((x) => x.name.toLowerCase().includes(qq));
  }, [items, q]);

  function add() {
    const n = name.trim();
    if (!n) return alert("Name required.");
    setItems((p) => [{ id: uid(), name: n, durationMin: Math.max(5, Number(durationMin) || 60), notes, createdUtc: nowUtc() }, ...(p || [])]);
    setName(""); setNotes(""); setDurationMin(60);
  }

  function del(id: string) {
    if (!confirm("Delete this event type?")) return;
    setItems((p) => (p || []).filter((x) => x.id !== id));
  }

  async function exportJson() {
    const txt = JSON.stringify({ version: 1, exportedUtc: nowUtc(), items }, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied export JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  function importJson() {
    const raw = window.prompt("Paste export JSON:");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      const arr = Array.isArray(p.items) ? p.items : [];
      const cleaned: Item[] = arr.filter((x: any) => x && x.name).map((x: any) => ({
        id: String(x.id || uid()),
        name: String(x.name),
        durationMin: Number(x.durationMin || 60),
        notes: String(x.notes || ""),
        createdUtc: String(x.createdUtc || nowUtc()),
      }));
      setItems(cleaned);
      alert("Imported.");
    } catch {
      alert("Invalid JSON.");
    }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🎯 Owner — Event Types Library (UI-only)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={exportJson}>Export</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={importJson}>Import</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input className="zombie-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" style={{ padding: "10px 12px", minWidth: 220 }} />
          <div style={{ opacity: 0.75, fontSize: 12 }}>Count: {items.length}</div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(320px, 1.1fr)", gap: 12 }}>
        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>Types</div>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {filtered.map((x) => (
              <div key={x.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                <div style={{ fontWeight: 900 }}>{x.name}</div>
                <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>Default: {x.durationMin} min</div>
                {x.notes ? <div style={{ opacity: 0.8, fontSize: 12, marginTop: 6, whiteSpace: "pre-wrap" }}>{x.notes}</div> : null}
                <button className="zombie-btn" style={{ marginTop: 8, padding: "6px 8px", fontSize: 12 }} onClick={() => del(x.id)}>Delete</button>
              </div>
            ))}
            {filtered.length === 0 ? <div style={{ opacity: 0.75 }}>No matches.</div> : null}
          </div>
        </div>

        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>Add Type</div>
          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Name</div>
            <input className="zombie-input" value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} />
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Default duration (min)</div>
            <input className="zombie-input" type="number" value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} style={{ width: "100%", padding: "10px 12px" }} />
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Notes</div>
            <textarea className="zombie-input" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: "100%", minHeight: 120, padding: "10px 12px" }} />
          </div>
          <button className="zombie-btn" style={{ marginTop: 12, padding: "10px 12px" }} onClick={add}>Add</button>
        </div>
      </div>
    </div>
  );
}