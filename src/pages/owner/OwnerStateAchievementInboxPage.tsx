import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type Req = {
  id: string;
  state_code: string;
  player_name: string;
  alliance_name: string;
  achievement_type_id: string;
  option_id: string | null;
  status: string;
  current_count: number;
  required_count: number;
  completed_at: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type AchType = { id: string; name: string; requires_option?: boolean; required_count?: number | null };
type AchOption = { id: string; label: string };

const STATE_CODE = "789";
const LOCAL_KEY = "sad_state_achievement_requests_local_v1";

function loadLocal(): any[] {
  try { const raw = localStorage.getItem(LOCAL_KEY); return raw ? (JSON.parse(raw) || []) : []; } catch { return []; }
}
function saveLocal(rows: any[]) { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(rows)); } catch {} }
function nowUtc(){ return new Date().toISOString(); }

export default function OwnerStateAchievementInboxPage() {
  const [rows, setRows] = useState<Req[]>([]);
  const [types, setTypes] = useState<Record<string, AchType>>({});
  const [opts, setOpts] = useState<Record<string, AchOption>>({});
  const [err, setErr] = useState<string|null>(null);
  const [mode, setMode] = useState<"supabase"|"local">("supabase");
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    setErr(null);

    // Load types/options for labels (best-effort)
    const tRes = await supabase
      .from("state_achievement_types")
      .select("id,name,requires_option,required_count")
      .eq("state_code", STATE_CODE);

    if (!tRes.error) {
      const map: any = {};
      for (const t of (tRes.data || []) as any[]) map[t.id] = t;
      setTypes(map);
    }

    const oRes = await supabase
      .from("state_achievement_options")
      .select("id,label")
      .eq("state_code", STATE_CODE);

    if (!oRes.error) {
      const map: any = {};
      for (const o of (oRes.data || []) as any[]) map[o.id] = o;
      setOpts(map);
    }

    // Load requests (Supabase-first)
    const rRes = await supabase
      .from("state_achievement_requests")
      .select("id,state_code,player_name,alliance_name,achievement_type_id,option_id,status,current_count,required_count,completed_at,notes,created_at,updated_at")
      .eq("state_code", STATE_CODE)
      .order("created_at", { ascending: false });

    if (!rRes.error) {
      setMode("supabase");
      setRows((rRes.data || []) as any);
      return;
    }

    // fallback local
    setMode("local");
    setErr("Supabase load failed; showing local fallback. " + rRes.error.message);
    setRows(loadLocal() as any);
  }

  const filtered = useMemo(() => {
    const arr = rows || [];
    if (filter === "all") return arr;
    return arr.filter(r => String((r as any).status || "") === filter);
  }, [rows, filter]);

  const progressBoard = useMemo(() => {
    // group by player+achievement
    const m = new Map<string, { player: string; alliance: string; ach: string; cur: number; req: number }>();
    for (const r of rows || []) {
      const player = String((r as any).player_name || "");
      const alliance = String((r as any).alliance_name || "");
      const achName = types[(r as any).achievement_type_id]?.name || (r as any).achievement_type_id;
      const key = player + "|" + achName;
      const cur = Number((r as any).current_count || 0);
      const req = Math.max(1, Number((r as any).required_count || types[(r as any).achievement_type_id]?.required_count || 1));
      const prev = m.get(key);
      if (!prev || cur > prev.cur) m.set(key, { player, alliance, ach: achName, cur, req });
    }
    return Array.from(m.values()).sort((a,b)=> a.player.localeCompare(b.player) || a.ach.localeCompare(b.ach));
  }, [rows, types]);

  async function updateRow(id: string, patch: any) {
    if (mode === "supabase") {
      const u = await supabase.from("state_achievement_requests").update({ ...patch, updated_at: nowUtc() }).eq("id", id).select("*").maybeSingle();
      if (u.error) { alert("Update failed: " + u.error.message); return; }
      await refresh();
      return;
    }

    // local
    const arr = loadLocal();
    const next = arr.map((r: any) => r.id === id ? ({ ...r, ...patch, updated_utc: nowUtc() }) : r);
    saveLocal(next);
    setRows(next as any);
  }

  async function exportJson() {
    const payload = { version: 1, exportedUtc: nowUtc(), mode, rows };
    const txt = JSON.stringify(payload, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied inbox export JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  function importJson() {
    const raw = window.prompt("Paste inbox export JSON:");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      if (!Array.isArray(p?.rows)) throw new Error("bad");
      saveLocal(p.rows);
      alert("Imported to local fallback store.");
      setMode("local");
      setRows(p.rows);
    } catch {
      alert("Invalid JSON.");
    }
  }

  function label(r: Req) {
    const t = types[(r as any).achievement_type_id]?.name || (r as any).achievement_type_id;
    const o = (r as any).option_id ? (opts[(r as any).option_id!]?.label || (r as any).option_id) : null;
    return o ? `${t} — ${o}` : t;
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:10, flexWrap:"wrap", alignItems:"center" }}>
        <h2 style={{ margin:0 }}>📥 Owner — Achievement Inbox (State 789)</h2>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <button className="zombie-btn" style={{ padding:"10px 12px" }} onClick={refresh}>Refresh</button>
          <button className="zombie-btn" style={{ padding:"10px 12px" }} onClick={exportJson}>Export</button>
          <button className="zombie-btn" style={{ padding:"10px 12px" }} onClick={importJson}>Import (Local)</button>
          <SupportBundleButton />
        </div>
      </div>

      {err ? <div className="zombie-card" style={{ marginTop:12, border:"1px solid rgba(255,180,180,0.25)" }}>{err}</div> : null}

      <div className="zombie-card" style={{ marginTop:12 }}>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
          <div style={{ opacity:0.75, fontSize:12 }}>Mode</div>
          <div style={{ fontWeight:900 }}>{mode}</div>

          <div style={{ marginLeft:16, opacity:0.75, fontSize:12 }}>Filter</div>
          <select className="zombie-input" value={filter} onChange={(e)=>setFilter(e.target.value)} style={{ padding:"10px 12px" }}>
            <option value="all">All</option>
            <option value="new">new</option>
            <option value="tracking">tracking</option>
            <option value="approved">approved</option>
            <option value="complete">complete</option>
            <option value="denied">denied</option>
          </select>
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop:12 }}>
        <div style={{ fontWeight:900 }}>Progress Board</div>
        <div style={{ marginTop:10, display:"grid", gap:8 }}>
          {progressBoard.map((p, idx)=>(
            <div key={idx} style={{ padding:10, borderRadius:12, border:"1px solid rgba(255,255,255,0.10)", background:"rgba(0,0,0,0.20)" }}>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
                <div style={{ fontWeight:900 }}>{p.player}</div>
                <div style={{ opacity:0.75 }}>{p.alliance}</div>
                <div style={{ opacity:0.85 }}>{p.ach}</div>
                <div style={{ marginLeft:"auto", fontWeight:900 }}>
                  {p.cur}/{p.req} {p.cur >= p.req ? "✅" : ""}
                </div>
              </div>
            </div>
          ))}
          {progressBoard.length===0 ? <div style={{ opacity:0.75 }}>No progress yet.</div> : null}
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop:12 }}>
        <div style={{ fontWeight:900 }}>Requests ({filtered.length})</div>

        <div style={{ marginTop:10, display:"grid", gap:8 }}>
          {filtered.map(r=> {
            const cur = Number((r as any).current_count || 0);
            const req = Math.max(1, Number((r as any).required_count || 1));
            return (
              <div key={(r as any).id} style={{ padding:10, borderRadius:12, border:"1px solid rgba(255,255,255,0.10)", background:"rgba(0,0,0,0.20)" }}>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
                  <div style={{ fontWeight:900 }}>{(r as any).player_name}</div>
                  <div style={{ opacity:0.75 }}>{(r as any).alliance_name}</div>
                  <div style={{ opacity:0.9 }}>{label(r)}</div>
                  <div style={{ marginLeft:"auto", opacity:0.8, fontSize:12 }}>Status: {(r as any).status}</div>
                </div>

                <div style={{ marginTop:10, display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
                  <div style={{ opacity:0.75, fontSize:12 }}>Progress</div>
                  <input className="zombie-input" type="number" min={0} max={req} value={cur} onChange={(e)=>updateRow((r as any).id, { current_count: Number(e.target.value) })} style={{ padding:"10px 12px", width:110 }} />
                  <div style={{ opacity:0.75, fontSize:12 }}>/ {req}</div>

                  <div style={{ opacity:0.75, fontSize:12 }}>Status</div>
                  <select className="zombie-input" value={String((r as any).status || "new")} onChange={(e)=>updateRow((r as any).id, { status: e.target.value })} style={{ padding:"10px 12px" }}>
                    <option value="new">new</option>
                    <option value="tracking">tracking</option>
                    <option value="approved">approved</option>
                    <option value="complete">complete</option>
                    <option value="denied">denied</option>
                  </select>

                  <button className="zombie-btn" style={{ padding:"10px 12px" }} onClick={()=>updateRow((r as any).id, { completed_at: nowUtc(), status: "complete" })}>
                    Mark Complete
                  </button>
                </div>

                <div style={{ marginTop:10 }}>
                  <div style={{ opacity:0.75, fontSize:12, marginBottom:6 }}>Notes</div>
                  <textarea className="zombie-input" defaultValue={String((r as any).notes || "")} onBlur={(e)=>updateRow((r as any).id, { notes: e.target.value })} style={{ width:"100%", minHeight:70, padding:"10px 12px" }} />
                </div>

                <div style={{ marginTop:8, opacity:0.6, fontSize:11 }}>
                  id: {(r as any).id} • created: {String((r as any).created_at || (r as any).created_utc || "")}
                </div>
              </div>
            );
          })}
          {filtered.length===0 ? <div style={{ opacity:0.75 }}>No requests.</div> : null}
        </div>
      </div>
    </div>
  );
}
