import React, { useEffect, useMemo, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type Alert = { id: string; title: string; body: string; pinned: boolean; createdUtc: string };
const KEY = "sad_state789_alerts_v1";

function uid() { return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16); }
function nowUtc() { return new Date().toISOString(); }
function load(): Alert[] { try { const raw = localStorage.getItem(KEY); if (!raw) return []; const arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; } catch { return []; } }
function save(v: Alert[]) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} }

export default function State789AlertsPage() {
  const [rows, setRows] = useState<Alert[]>(() => load());
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => save(rows), [rows]);

  const pinned = useMemo(() => (rows || []).filter((x) => x.pinned), [rows]);

  function add() {
    if (!title.trim()) return alert("Title required.");
    setRows((p) => [{ id: uid(), title: title.trim(), body: body.trim(), pinned: true, createdUtc: nowUtc() }, ...(p || [])]);
    setTitle(""); setBody("");
  }

  function del(id: string) {
    if (!confirm("Delete alert?")) return;
    setRows((p) => (p || []).filter((x) => x.id !== id));
  }

  function pin(id: string) {
    setRows((p) => (p || []).map((x) => (x.id === id ? { ...x, pinned: !x.pinned } : x)));
  }

  async function exportJson() {
    const txt = JSON.stringify({ version: 1, exportedUtc: nowUtc(), alerts: rows }, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied export JSON."); } catch { window.prompt("Copy:", txt); }
  }

  function importJson() {
    const raw = window.prompt("Paste export JSON:");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      const arr = Array.isArray(p.alerts) ? p.alerts : [];
      const cleaned: Alert[] = arr.filter((x: any) => x && x.title).map((x: any) => ({
        id: String(x.id || uid()),
        title: String(x.title),
        body: String(x.body || ""),
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
        <h2 style={{ margin: 0 }}>🚨 State 789 Alerts (UI-only)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={exportJson}>Export</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={importJson}>Import</button>
          <SupportBundleButton />
        </div>
      </div>

      {pinned.length ? (
        <div className="zombie-card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 900 }}>📌 Pinned</div>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {pinned.map((a) => (
              <div key={a.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                <div style={{ fontWeight: 900 }}>{a.title}</div>
                {a.body ? <div style={{ opacity: 0.85, marginTop: 8, whiteSpace: "pre-wrap" }}>{a.body}</div> : null}
                <div style={{ opacity: 0.6, fontSize: 11, marginTop: 8 }}>UTC: {a.createdUtc}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => pin(a.id)}>Unpin</button>
                  <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => del(a.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(300px, 1fr) minmax(320px, 1.1fr)", gap: 12 }}>
        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>Create + Pin Alert</div>
          <input className="zombie-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Alert title…" style={{ width: "100%", padding: "10px 12px", marginTop: 10 }} />
          <textarea className="zombie-input" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Alert body…" style={{ width: "100%", minHeight: 140, padding: "10px 12px", marginTop: 10 }} />
          <button className="zombie-btn" style={{ marginTop: 10, padding: "10px 12px" }} onClick={add}>Pin Alert</button>
          <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>UI-only (localStorage).</div>
        </div>

        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>All Alerts</div>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {rows.map((a) => (
              <div key={a.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                <div style={{ fontWeight: 900 }}>{a.pinned ? "📌 " : ""}{a.title}</div>
                {a.body ? <div style={{ opacity: 0.85, marginTop: 8, whiteSpace: "pre-wrap" }}>{a.body}</div> : null}
                <div style={{ opacity: 0.6, fontSize: 11, marginTop: 8 }}>UTC: {a.createdUtc}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => pin(a.id)}>{a.pinned ? "Unpin" : "Pin"}</button>
                  <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => del(a.id)}>Delete</button>
                </div>
              </div>
            ))}
            {rows.length === 0 ? <div style={{ opacity: 0.75 }}>No alerts yet.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}