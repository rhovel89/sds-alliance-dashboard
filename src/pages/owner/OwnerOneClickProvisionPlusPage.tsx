import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type Req = { id: string; user_id: string; game_name: string | null; requested_alliances: any; status: string; created_at: string };

const PREFILL_KEY = "sad_oneclick_provision_prefill_v1";

export default function OwnerOneClickProvisionPlusPage() {
  const nav = useNavigate();
  const [rows,setRows] = useState<Req[]>([]);
  const [err,setErr] = useState<string|null>(null);
  const [loading,setLoading] = useState(false);

  const [allianceCode,setAllianceCode] = useState("WOC");
  const [role,setRole] = useState("member");

  useEffect(()=>{
    (async()=>{
      setLoading(true); setErr(null);
      const res = await supabase
        .from("access_requests")
        .select("id,user_id,game_name,requested_alliances,status,created_at")
        .eq("status","pending")
        .order("created_at",{ ascending:true });
      setLoading(false);
      if (res.error) { setErr(res.error.message); setRows([]); return; }
      setRows((res.data||[]) as any);
    })();
  },[]);

  const list = useMemo(()=>rows||[], [rows]);

  function openProvision(req: Req) {
    const payload = {
      version: 1,
      createdUtc: new Date().toISOString(),
      requestId: req.id,
      userId: req.user_id,
      allianceCode: allianceCode.toUpperCase(),
      role,
      note: "UI-only prefill. Provision page can read this later if needed.",
    };
    try { localStorage.setItem(PREFILL_KEY, JSON.stringify(payload)); } catch {}
    // If your existing provision route differs, change here (only this line).
    nav("/owner/oneclick-provision");
  }

  async function copyPayload(req: Req) {
    const payload = {
      version: 1,
      createdUtc: new Date().toISOString(),
      requestId: req.id,
      userId: req.user_id,
      allianceCode: allianceCode.toUpperCase(),
      role,
      requested_alliances: req.requested_alliances || null,
    };
    const txt = JSON.stringify(payload, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied provision payload JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  return (
    <div style={{ padding:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:10, flexWrap:"wrap", alignItems:"center" }}>
        <h2 style={{ margin:0 }}>⚡ Owner — One-click Provision+ (UI helper)</h2>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop:12 }}>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
          <div style={{ opacity:0.75, fontSize:12 }}>Assign Alliance</div>
          <input className="zombie-input" value={allianceCode} onChange={(e)=>setAllianceCode(e.target.value.toUpperCase())} style={{ padding:"10px 12px", width:120 }} />
          <div style={{ opacity:0.75, fontSize:12 }}>Role</div>
          <select className="zombie-input" value={role} onChange={(e)=>setRole(e.target.value)} style={{ padding:"10px 12px" }}>
            <option value="member">member</option>
            <option value="viewer">viewer</option>
            <option value="r4">r4</option>
            <option value="r5">r5</option>
            <option value="owner">owner</option>
          </select>
          <div style={{ marginLeft:"auto", opacity:0.7, fontSize:12 }}>
            Uses existing access_requests; no DB changes here.
          </div>
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop:12 }}>
        <div style={{ fontWeight:900 }}>Pending Requests</div>
        {err ? <div style={{ marginTop:10, color:"#ffb3b3" }}>{err}</div> : null}
        {loading ? <div style={{ marginTop:10, opacity:0.75 }}>Loading…</div> : null}

        <div style={{ marginTop:10, display:"grid", gap:8 }}>
          {list.map(r=>(
            <div key={r.id} style={{ padding:10, borderRadius:12, border:"1px solid rgba(255,255,255,0.10)", background:"rgba(0,0,0,0.20)" }}>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
                <div style={{ fontWeight:900 }}>{r.game_name || "Request"}</div>
                <div style={{ opacity:0.75, fontSize:12 }}>User: {r.user_id}</div>
                <div style={{ opacity:0.75, fontSize:12 }}>UTC: {r.created_at}</div>
                <div style={{ marginLeft:"auto", display:"flex", gap:8, flexWrap:"wrap" }}>
                  <button className="zombie-btn" style={{ padding:"6px 8px", fontSize:12 }} onClick={()=>copyPayload(r)}>Copy Payload</button>
                  <button className="zombie-btn" style={{ padding:"6px 8px", fontSize:12 }} onClick={()=>openProvision(r)}>Open Provision</button>
                </div>
              </div>
            </div>
          ))}
          {(!loading && list.length===0) ? <div style={{ opacity:0.75 }}>No pending requests.</div> : null}
        </div>
      </div>
    </div>
  );
}