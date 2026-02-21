import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

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
function save(s: Store){ try{ localStorage.setItem(KEY, JSON.stringify(s)); }catch{} }

async function record(label: string, fn: ()=>Promise<void>) {
  const online = typeof navigator !== "undefined" ? !!navigator.onLine : true;
  const s = load();
  try {
    await fn();
    const row: Row = { tsUtc: nowUtc(), ok: true, label, online };
    const next = { version: 1, rows: [row, ...(s.rows||[])].slice(0, 20) };
    save(next);
    return row;
  } catch (e: any) {
    const row: Row = { tsUtc: nowUtc(), ok: false, label, online, detail: String(e?.message || e) };
    const next = { version: 1, rows: [row, ...(s.rows||[])].slice(0, 20) };
    save(next);
    return row;
  }
}

async function copyText(txt: string) {
  try { await navigator.clipboard.writeText(txt); alert("Copied."); }
  catch { window.prompt("Copy:", txt); }
}

export default function GlobalStatusFab() {
  const [open,setOpen] = useState(false);
  const [store,setStore] = useState<Store>(()=>load());

  useEffect(()=>{
    const id = window.setInterval(()=>setStore(load()), 1500);
    return ()=>window.clearInterval(id);
  },[]);

  const last = useMemo(()=> (store.rows||[])[0] || null, [store.rows]);

  async function runCheck() {
    const row = await record("supabase.auth.getUser", async ()=>{
      const r = await supabase.auth.getUser();
      if (r.error) throw r.error;
    });
    setStore(load());
    if (!row.ok) alert(row.detail || "Check failed");
  }

  async function copyBundle() {
    const online = typeof navigator !== "undefined" ? !!navigator.onLine : true;
    const user = await supabase.auth.getUser();
    const payload = {
      tsUtc: nowUtc(),
      href: window.location.href,
      path: window.location.pathname,
      online,
      userId: user.data.user?.id || null,
      history: (load().rows||[]),
      userAgent: navigator.userAgent,
    };
    await copyText(JSON.stringify(payload, null, 2));
  }

  return (
    <>
      <div
        style={{
          position:"fixed", right:14, bottom:14, zIndex:9999,
          display:"flex", gap:10, alignItems:"center",
        }}
      >
        <button
          className="zombie-btn"
          style={{ padding:"10px 12px", borderRadius:14, display:"flex", gap:8, alignItems:"center" }}
          onClick={()=>setOpen(o=>!o)}
          title="Support Bundle + Realtime history"
        >
          <span>📦</span>
          <span style={{ fontWeight:900 }}>Support</span>
          <span style={{
            width:10, height:10, borderRadius:999,
            background: last ? (last.ok ? "#6dff6d" : "#ff6d6d") : "#999",
            display:"inline-block"
          }} />
        </button>
      </div>

      {open ? (
        <div style={{
          position:"fixed", right:14, bottom:64, zIndex:9999,
          width:360, maxWidth:"92vw",
          borderRadius:16, border:"1px solid rgba(255,255,255,0.12)",
          background:"rgba(0,0,0,0.85)", backdropFilter:"blur(6px)",
          padding:12
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10 }}>
            <div style={{ fontWeight:900 }}>Support + Connection</div>
            <button className="zombie-btn" style={{ padding:"6px 8px", fontSize:12 }} onClick={()=>setOpen(false)}>Close</button>
          </div>

          <div style={{ marginTop:10, display:"flex", gap:10, flexWrap:"wrap" }}>
            <button className="zombie-btn" style={{ padding:"8px 10px", fontSize:12 }} onClick={copyBundle}>Copy Support Bundle</button>
            <button className="zombie-btn" style={{ padding:"8px 10px", fontSize:12 }} onClick={runCheck}>Run Check</button>
            <button className="zombie-btn" style={{ padding:"8px 10px", fontSize:12 }} onClick={()=>window.location.href="/owner/realtime-history"}>History Page</button>
          </div>

          <div style={{ marginTop:10, opacity:0.75, fontSize:12 }}>
            Last: {last ? `${last.ok?"OK":"FAIL"} • ${last.tsUtc} • ${last.label}` : "—"}
          </div>

          <div style={{ marginTop:10, maxHeight:200, overflow:"auto", display:"grid", gap:6 }}>
            {(store.rows||[]).slice(0, 10).map((r, i)=>(
              <div key={i} style={{ padding:8, borderRadius:12, border:"1px solid rgba(255,255,255,0.10)", background:"rgba(0,0,0,0.25)" }}>
                <div style={{ fontWeight:900, fontSize:12 }}>{r.ok?"✅":"❌"} {r.label}</div>
                <div style={{ opacity:0.7, fontSize:11 }}>{r.tsUtc} • online={String(r.online)}</div>
                {r.detail ? <div style={{ opacity:0.75, fontSize:11, marginTop:4 }}>{r.detail}</div> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}