import React, { useMemo, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type RoleMapStore = { version: 1; global: Record<string,string>; alliances: Record<string, Record<string,string>> };
type ChannelEntry = { id: string; name: string; channelId: string; createdUtc: string };
type ChannelMapStore = { version: 1; global: ChannelEntry[]; alliances: Record<string, ChannelEntry[]> };

const ROLE_KEY = "sad_discord_role_map_v1";
const CHAN_KEY = "sad_discord_channel_map_v1";

function safeJson<T>(raw: string|null): T|null { if(!raw) return null; try{ return JSON.parse(raw) as T; }catch{ return null; } }
function loadRoles(): RoleMapStore { const s = safeJson<RoleMapStore>(localStorage.getItem(ROLE_KEY)); return (s && s.version===1) ? s : { version:1, global:{}, alliances:{} }; }
function loadChans(): ChannelMapStore { const s = safeJson<ChannelMapStore>(localStorage.getItem(CHAN_KEY)); return (s && s.version===1) ? s : { version:1, global:[], alliances:{} }; }
function save(key: string, v: any){ try{ localStorage.setItem(key, JSON.stringify(v)); }catch{} }
function norm(s: any){ return String(s||"").trim().toLowerCase(); }

export default function OwnerDiscordMentionsToolsPage() {
  const [scope,setScope] = useState<"global"|"alliance">("alliance");
  const [alliance,setAlliance] = useState("WOC");
  const [roles,setRoles] = useState<RoleMapStore>(()=>loadRoles());
  const [chans,setChans] = useState<ChannelMapStore>(()=>loadChans());
  const [bulk,setBulk] = useState("");

  const roleMap = useMemo(()=>{
    const ac = alliance.toUpperCase();
    return scope==="global" ? (roles.global||{}) : (roles.alliances?.[ac]||{});
  }, [roles, scope, alliance]);

  const chanList = useMemo(()=>{
    const ac = alliance.toUpperCase();
    return scope==="global" ? (chans.global||[]) : (chans.alliances?.[ac]||[]);
  }, [chans, scope, alliance]);

  function applyBulk() {
    const lines = bulk.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    if (!lines.length) return alert("Paste lines like: Leadership=123 or announcements=456");
    const isRole = confirm("OK = import as ROLES, Cancel = import as CHANNELS");
    const ac = alliance.toUpperCase();

    if (isRole) {
      const next = { ...roles, global: { ...(roles.global||{}) }, alliances: { ...(roles.alliances||{}) } };
      const target = scope==="global" ? { ...(next.global||{}) } : { ...(next.alliances?.[ac]||{}) };
      for (const l of lines) {
        const [k,v] = l.split("=").map(x=>x.trim());
        if (!k) continue;
        target[k] = v || "";
      }
      if (scope==="global") next.global = target; else next.alliances[ac] = target;
      setRoles(next); save(ROLE_KEY, next);
      alert("Roles imported.");
    } else {
      const next = { ...chans, global: [...(chans.global||[])], alliances: { ...(chans.alliances||{}) } };
      const list = scope==="global" ? [...(next.global||[])] : [...(next.alliances?.[ac]||[])];
      for (const l of lines) {
        const [k,v] = l.split("=").map(x=>x.trim());
        if (!k) continue;
        const name = k.replace(/^#/, "");
        list.unshift({ id: Math.random().toString(16).slice(2), name, channelId: v||"", createdUtc: new Date().toISOString() });
      }
      if (scope==="global") next.global = list; else next.alliances[ac] = list;
      setChans(next); save(CHAN_KEY, next);
      alert("Channels imported.");
    }
    setBulk("");
  }

  const [preview,setPreview] = useState("Ping @Leadership in #announcements");
  const resolved = useMemo(()=>{
    const roleLut: Record<string,string> = {};
    const chanLut: Record<string,string> = {};

    const mergeRoles = (m: Record<string,string>) => { for (const k of Object.keys(m||{})) roleLut[norm(k)] = String(m[k]||"").trim(); };
    mergeRoles(roles.global||{});
    if (scope==="alliance") mergeRoles(roles.alliances?.[alliance.toUpperCase()]||{});

    const mergeChans = (lst: ChannelEntry[]) => { for (const c of lst||[]) chanLut[norm(c.name)] = String(c.channelId||"").trim(); };
    mergeChans(chans.global||[]);
    if (scope==="alliance") mergeChans(chans.alliances?.[alliance.toUpperCase()]||[]);

    let t = preview || "";
    t = t.replace(/@([A-Za-z0-9_\-]{2,64})/g, (m,k)=>{ const id = roleLut[norm(k)]; return id ? `<@&${id}>` : m; });
    t = t.replace(/#([A-Za-z0-9_\-]{2,64})/g, (m,k)=>{ const id = chanLut[norm(k)]; return id ? `<#${id}>` : m; });
    return t;
  }, [preview, roles, chans, scope, alliance]);

  async function exportAll() {
    const payload = { version:1, exportedUtc:new Date().toISOString(), roles, chans };
    const txt = JSON.stringify(payload, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied mentions export JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  return (
    <div style={{ padding:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:10, flexWrap:"wrap", alignItems:"center" }}>
        <h2 style={{ margin:0 }}>🔧 Owner — Discord Mentions Tools (bulk + preview)</h2>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <button className="zombie-btn" style={{ padding:"10px 12px" }} onClick={exportAll}>Export</button>
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
              <input className="zombie-input" value={alliance} onChange={(e)=>setAlliance(e.target.value.toUpperCase())} style={{ padding:"10px 12px", width:120 }} />
            </>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"minmax(320px,1fr) minmax(320px,1fr)", gap:12 }}>
        <div className="zombie-card">
          <div style={{ fontWeight:900 }}>Bulk Import</div>
          <div style={{ opacity:0.7, fontSize:12, marginTop:6 }}>
            Paste lines: <b>Leadership=123</b> or <b>announcements=456</b>. Then choose Roles vs Channels.
          </div>
          <textarea className="zombie-input" value={bulk} onChange={(e)=>setBulk(e.target.value)} style={{ width:"100%", minHeight:160, padding:"10px 12px", marginTop:10 }} />
          <button className="zombie-btn" style={{ marginTop:10, padding:"10px 12px" }} onClick={applyBulk}>Apply</button>
          <div style={{ marginTop:10, opacity:0.75, fontSize:12 }}>
            Roles: {Object.keys(roleMap||{}).length} | Channels: {chanList.length}
          </div>
        </div>

        <div className="zombie-card">
          <div style={{ fontWeight:900 }}>Preview Resolver</div>
          <textarea className="zombie-input" value={preview} onChange={(e)=>setPreview(e.target.value)} style={{ width:"100%", minHeight:120, padding:"10px 12px", marginTop:10 }} />
          <div style={{ opacity:0.75, fontSize:12, marginTop:10 }}>Resolved</div>
          <pre style={{ margin:0, whiteSpace:"pre-wrap", fontSize:12, padding:10, borderRadius:12, border:"1px solid rgba(255,255,255,0.10)", background:"rgba(0,0,0,0.20)" }}>{resolved}</pre>
        </div>
      </div>
    </div>
  );
}