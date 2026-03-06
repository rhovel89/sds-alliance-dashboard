import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";

function s(v: any) { return v === null || v === undefined ? "" : String(v); }

const LS_KEY = "owner_dossier_recent_v1";

export default function OwnerDossierLookupPage() {
  const nav = useNavigate();
  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);
  function onSelectModule(k: string) { const to = cc.find(m => m.key === k)?.to; if (to) nav(to); }

  const [id, setId] = useState("");
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const arr = raw ? (JSON.parse(raw) as any[]) : [];
      setRecent((Array.isArray(arr) ? arr : []).map(x => String(x)).filter(Boolean).slice(0, 12));
    } catch {}
  }, []);

  function open(pid: string) {
    const v = s(pid).trim();
    if (!v) return;

    try {
      const next = [v, ...recent.filter(x => x !== v)].slice(0, 12);
      setRecent(next);
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {}

    nav(`/dossier/${encodeURIComponent(v)}`);
  }

  return (
    <CommandCenterShell
      title="Owner Dossier Lookup"
      subtitle="Open any player's dossier by player_id (RLS enforced)"
      modules={modules}
      activeModuleKey="owner"
      onSelectModule={onSelectModule}
      topRight={
        <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/approval-center")}>Approval Center</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/ops")}>Ops</button>
        </div>
      }
    >
      <div style={{ maxWidth: 760, display:"flex", flexDirection:"column", gap: 12 }}>
        <div style={{ border:"1px solid rgba(255,255,255,0.10)", background:"rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950 }}>Open dossier by player_id</div>
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
            Paste a UUID from players.id or player_auth_links.player_id.
          </div>

          <div style={{ display:"flex", gap: 10, marginTop: 10, flexWrap:"wrap" }}>
            <input
              value={id}
              onChange={(e)=>setId(e.target.value)}
              placeholder="player_id (uuid)"
              style={{ flex: 1, minWidth: 320, padding:"10px 12px", borderRadius: 12, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(0,0,0,0.25)", color:"rgba(255,255,255,0.92)" }}
            />
            <button className="zombie-btn" type="button" onClick={() => open(id)}>Open</button>
          </div>
        </div>

        <div style={{ border:"1px solid rgba(255,255,255,0.10)", background:"rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950 }}>Recent</div>
          <div style={{ display:"flex", flexDirection:"column", gap: 8, marginTop: 10 }}>
            {recent.map((r) => (
              <button key={r} className="zombie-btn" type="button" style={{ textAlign:"left", whiteSpace:"normal" }} onClick={() => open(r)}>
                {r}
              </button>
            ))}
            {!recent.length ? <div style={{ opacity: 0.7, fontSize: 12 }}>No recent dossier opens yet.</div> : null}
          </div>
        </div>
      </div>
    </CommandCenterShell>
  );
}
