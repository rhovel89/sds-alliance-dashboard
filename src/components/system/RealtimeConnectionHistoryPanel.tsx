import React, { useEffect, useMemo, useState } from "react";

type Item = { tsUtc: string; browserOnline: boolean; supabaseOk: boolean | null; alliance: string | null };
type Store = { version: 1; items: Item[] };

const KEY = "sad_conn_history_v1";

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { version: 1, items: [] };
    const s = JSON.parse(raw) as Store;
    if (s && s.version === 1 && Array.isArray(s.items)) return s;
  } catch {}
  return { version: 1, items: [] };
}

function save(s: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export function pushConnHistory(item: Item) {
  const s = load();
  const next: Store = { version: 1, items: [item, ...(s.items || [])].slice(0, 20) };
  save(next);
}

export function RealtimeConnectionHistoryPanel() {
  const [store, setStore] = useState<Store>(() => load());

  useEffect(() => {
    const id = window.setInterval(() => setStore(load()), 2000);
    return () => window.clearInterval(id);
  }, []);

  const items = useMemo(() => store.items || [], [store.items]);

  async function copyJson() {
    const txt = JSON.stringify(store, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied history JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  function clear() {
    if (!confirm("Clear connection history?")) return;
    save({ version: 1, items: [] });
    setStore(load());
  }

  return (
    <div className="zombie-card" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 900 }}>📡 Connection History (last 20)</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={copyJson}>Copy JSON</button>
          <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={clear}>Clear</button>
        </div>
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {items.length === 0 ? <div style={{ opacity: 0.75 }}>No history yet.</div> : null}
        {items.map((it, idx) => (
          <div key={idx} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
            <div style={{ fontWeight: 800 }}>
              {it.supabaseOk === true ? "ONLINE" : it.supabaseOk === false ? "DEGRADED" : "CHECKING"}{" "}
              {it.browserOnline ? "" : "(OFFLINE)"}
            </div>
            <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
              UTC: {it.tsUtc} {it.alliance ? (" | Alliance: " + it.alliance) : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RealtimeConnectionHistoryPanel;