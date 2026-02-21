import React, { useEffect, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type Row = { tsUtc: string; ok: boolean; label: string; detail?: string; online: boolean };
type Store = { version: 1; rows: Row[] };

const KEY = "sad_realtime_history_v1";
function nowUtc(){ return new Date().toISOString(); }

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { version: 1, rows: [] };
    const s = JSON.parse(raw) as Store;
    if (!s || s.version !== 1 || !Array.isArray(s.rows)) throw new Error("bad");
    return s;
  } catch {
    return { version: 1, rows: [] };
  }
}

export default function OwnerRealtimeHistoryPage() {
  const [store, setStore] = useState<Store>(() => load());

  useEffect(() => {
    const id = window.setInterval(() => {
      try {
        const s = load();
        setStore(s);
      } catch {}
    }, 1500);
    return () => window.clearInterval(id);
  }, []);

  async function exportJson() {
    const txt = JSON.stringify({ ...store, exportedUtc: nowUtc() }, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied realtime history export JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:10, flexWrap:"wrap", alignItems:"center" }}>
        <h2 style={{ margin:0 }}>📡 Owner — Realtime / Connection History (UI-only)</h2>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <button className="zombie-btn" style={{ padding:"10px 12px" }} onClick={exportJson}>Export</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ opacity: 0.75, fontSize: 12 }}>
          Stored in <b>{KEY}</b> (last ~20 checks).
        </div>
        <div style={{ marginTop: 10, display:"grid", gap: 8 }}>
          {(store.rows||[]).slice(0, 20).map((r, idx) => (
            <div key={idx} style={{ padding: 10, borderRadius: 12, border:"1px solid rgba(255,255,255,0.10)", background:"rgba(0,0,0,0.20)" }}>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
                <div style={{ fontWeight:900 }}>{r.ok ? "✅" : "❌"} {r.label}</div>
                <div style={{ opacity:0.75, fontSize:12 }}>UTC: {r.tsUtc}</div>
                <div style={{ opacity:0.75, fontSize:12 }}>Online: {String(r.online)}</div>
              </div>
              {r.detail ? <div style={{ marginTop:6, opacity:0.75, fontSize:12 }}>{r.detail}</div> : null}
            </div>
          ))}
          {(store.rows||[]).length===0 ? <div style={{ opacity:0.75 }}>No history yet. Use the global 📦 widget to record checks.</div> : null}
        </div>
      </div>
    </div>
  );
}