import React, { useMemo, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type Template = {
  id: string;
  scope: "global" | "alliance";
  allianceCode: string | null;
  name: string;
  body: string;
  updatedUtc: string;
};

type Store = { version: 1; templates: Template[] };
const KEY = "sad_discord_broadcast_templates_v1";

function nowUtc(){ return new Date().toISOString(); }
function uid(){ return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16); }

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { version: 1, templates: [] };
    const s = JSON.parse(raw) as Store;
    if (!s || s.version !== 1 || !Array.isArray(s.templates)) throw new Error("bad");
    return s;
  } catch {
    return { version: 1, templates: [] };
  }
}
function save(s: Store){ try{ localStorage.setItem(KEY, JSON.stringify(s)); }catch{} }

export default function OwnerDiscordTemplatesPage() {
  const [store, setStore] = useState<Store>(()=>load());
  const [scope, setScope] = useState<"global"|"alliance">("alliance");
  const [allianceCode, setAllianceCode] = useState("WOC");
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [selectedId, setSelectedId] = useState<string|null>(null);

  const list = useMemo(()=>{
    const ac = allianceCode.toUpperCase();
    return (store.templates||[])
      .filter(t=> scope==="global" ? t.scope==="global" : (t.scope==="alliance" && String(t.allianceCode||"").toUpperCase()===ac))
      .sort((a,b)=> (b.updatedUtc||"").localeCompare(a.updatedUtc||""));
  }, [store.templates, scope, allianceCode]);

  function select(t: Template){
    setSelectedId(t.id);
    setScope(t.scope);
    setAllianceCode((t.allianceCode||"WOC").toUpperCase());
    setName(t.name);
    setBody(t.body||"");
  }

  function reset(){
    setSelectedId(null);
    setName("");
    setBody("");
  }

  function saveTpl(){
    const nm = name.trim();
    if (!nm) return alert("Template name required.");
    const t: Template = {
      id: selectedId || uid(),
      scope,
      allianceCode: scope==="alliance" ? allianceCode.toUpperCase() : null,
      name: nm,
      body: body || "",
      updatedUtc: nowUtc(),
    };
    const next = { ...store, templates: [...(store.templates||[])] };
    const idx = next.templates.findIndex(x=>x.id===t.id);
    if (idx>=0) next.templates[idx]=t; else next.templates.unshift(t);
    setStore(next); save(next);
    setSelectedId(t.id);
  }

  function del(id: string){
    if (!confirm("Delete template?")) return;
    const next = { ...store, templates: (store.templates||[]).filter(t=>t.id!==id) };
    setStore(next); save(next);
    if (selectedId===id) reset();
  }

  async function exportJson(){
    const txt = JSON.stringify({ ...store, exportedUtc: nowUtc() }, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied templates export JSON."); }
    catch { window.prompt("Copy:", txt); }
  }
  function importJson(){
    const raw = window.prompt("Paste templates export JSON:");
    if (!raw) return;
    try {
      const s = JSON.parse(raw) as Store;
      if (!s || s.version !== 1 || !Array.isArray(s.templates)) throw new Error("bad");
      setStore(s); save(s); alert("Imported.");
    } catch { alert("Invalid JSON."); }
  }

  return (
    <div style={{ padding:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:10, flexWrap:"wrap", alignItems:"center" }}>
        <h2 style={{ margin:0 }}>🧾 Owner — Discord Templates Library (UI-only)</h2>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <button className="zombie-btn" style={{ padding:"10px 12px" }} onClick={exportJson}>Export</button>
          <button className="zombie-btn" style={{ padding:"10px 12px" }} onClick={importJson}>Import</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop:12 }}>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
          <div style={{ opacity:0.75, fontSize:12 }}>Scope</div>
          <select className="zombie-input" value={scope} onChange={(e)=>setScope(e.target.value as any)} style={{ padding:"10px 12px" }}>
            <option value="alliance">Alliance</option>
            <option value="global">Global</option>
          </select>
          {scope==="alliance" ? (
            <>
              <div style={{ opacity:0.75, fontSize:12 }}>Alliance</div>
              <input className="zombie-input" value={allianceCode} onChange={(e)=>setAllianceCode(e.target.value.toUpperCase())} style={{ padding:"10px 12px", width:120 }} />
            </>
          ) : null}
          <button className="zombie-btn" style={{ marginLeft:"auto", padding:"10px 12px" }} onClick={reset}>+ New</button>
        </div>
      </div>

      <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"minmax(280px,1fr) minmax(360px,1.3fr)", gap:12 }}>
        <div className="zombie-card">
          <div style={{ fontWeight:900 }}>Templates</div>
          <div style={{ marginTop:10, display:"grid", gap:8 }}>
            {list.map(t=>(
              <div key={t.id} onClick={()=>select(t)} style={{ cursor:"pointer", padding:10, borderRadius:12, border:"1px solid rgba(255,255,255,0.10)", background: selectedId===t.id ? "rgba(120,255,120,0.10)" : "rgba(0,0,0,0.20)" }}>
                <div style={{ fontWeight:900 }}>{t.name}</div>
                <div style={{ opacity:0.65, fontSize:12, marginTop:4 }}>{t.updatedUtc}</div>
                <button className="zombie-btn" style={{ marginTop:8, padding:"6px 8px", fontSize:12 }} onClick={(ev)=>{ev.stopPropagation(); del(t.id);}}>Delete</button>
              </div>
            ))}
            {list.length===0 ? <div style={{ opacity:0.75 }}>No templates in this scope.</div> : null}
          </div>
        </div>

        <div className="zombie-card">
          <div style={{ fontWeight:900 }}>Edit</div>
          <div style={{ marginTop:10 }}>
            <div style={{ opacity:0.75, fontSize:12, marginBottom:6 }}>Template Name</div>
            <input className="zombie-input" value={name} onChange={(e)=>setName(e.target.value)} style={{ width:"100%", padding:"10px 12px" }} />
          </div>
          <div style={{ marginTop:10 }}>
            <div style={{ opacity:0.75, fontSize:12, marginBottom:6 }}>Body</div>
            <textarea className="zombie-input" value={body} onChange={(e)=>setBody(e.target.value)} style={{ width:"100%", minHeight:220, padding:"10px 12px" }} />
          </div>
          <button className="zombie-btn" style={{ marginTop:10, padding:"10px 12px" }} onClick={saveTpl}>Save</button>
        </div>
      </div>
    </div>
  );
}