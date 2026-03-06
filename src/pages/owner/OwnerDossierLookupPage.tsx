import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";
import { supabase } from "../../lib/supabaseClient";

function s(v: any) { return v === null || v === undefined ? "" : String(v); }

const LS_KEY = "owner_dossier_recent_v2";

type PlayerRow = { id: string; name?: string | null; game_name?: string | null; created_at?: string | null };

export default function OwnerDossierLookupPage() {
  const nav = useNavigate();
  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);
  function onSelectModule(k: string) { const to = cc.find((m) => m.key === k)?.to; if (to) nav(to); }

  const [status, setStatus] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [userId, setUserId] = useState("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<PlayerRow[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const arr = raw ? (JSON.parse(raw) as any[]) : [];
      setRecent((Array.isArray(arr) ? arr : []).map((x) => String(x)).filter(Boolean).slice(0, 12));
    } catch {}
  }, []);

  function remember(pid: string) {
    const v = s(pid).trim();
    if (!v) return;
    try {
      const next = [v, ...recent.filter((x) => x !== v)].slice(0, 12);
      setRecent(next);
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {}
  }

  function open(pid: string) {
    const v = s(pid).trim();
    if (!v) return;
    remember(v);
    nav(`/dossier/${encodeURIComponent(v)}`);
  }

  async function openByUserId(uid: string) {
    try {
      setStatus("");
      const u = s(uid).trim();
      if (!u) { setStatus("Enter a user_id."); return; }

      const link = await supabase
        .from("player_auth_links")
        .select("player_id,user_id")
        .eq("user_id", u)
        .maybeSingle();

      if (link.error) { setStatus(link.error.message); return; }
      const pid = s(link.data?.player_id);
      if (!pid) { setStatus("No player_auth_links row found for that user_id."); return; }
      open(pid);
    } catch (e: any) {
      setStatus(String(e?.message || e || "Lookup failed"));
    }
  }

  async function searchPlayers() {
    try {
      setStatus("");
      const term = s(q).trim();
      if (!term) { setRows([]); return; }

      const pattern = `%${term.replace(/%/g, "")}%`;
      const r = await supabase
        .from("players")
        .select("id,name,game_name,created_at")
        .or(`name.ilike.${pattern},game_name.ilike.${pattern}`)
        .order("created_at", { ascending: false })
        .limit(25);

      if (r.error) { setStatus(r.error.message); return; }
      setRows((r.data || []) as any[]);
    } catch (e: any) {
      setStatus(String(e?.message || e || "Search failed"));
    }
  }

  return (
    <CommandCenterShell
      title="Owner Dossier Lookup"
      subtitle="Open any player dossier • search by name • or map user_id → player_id"
      modules={modules}
      activeModuleKey="owner"
      onSelectModule={onSelectModule}
      topRight={
        <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/approval-center")}>Approval Center</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/ops")}>Ops</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/dashboard")}>Dashboard</button>
        </div>
      }
    >
      {status ? (
        <div style={{ marginBottom: 10, border: "1px solid rgba(176,18,27,0.35)", background:"rgba(176,18,27,0.12)", borderRadius: 12, padding: 10 }}>
          {status}
        </div>
      ) : null}

      <div style={{ maxWidth: 860, display:"flex", flexDirection:"column", gap: 12 }}>
        <div style={{ border:"1px solid rgba(255,255,255,0.10)", background:"rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950 }}>Open by player_id</div>
          <div style={{ display:"flex", gap: 10, marginTop: 10, flexWrap:"wrap" }}>
            <input
              value={playerId}
              onChange={(e)=>setPlayerId(e.target.value)}
              placeholder="player_id (uuid)"
              style={{ flex: 1, minWidth: 320, padding:"10px 12px", borderRadius: 12, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(0,0,0,0.25)", color:"rgba(255,255,255,0.92)" }}
            />
            <button className="zombie-btn" type="button" onClick={() => open(playerId)}>Open</button>
          </div>
        </div>

        <div style={{ border:"1px solid rgba(255,255,255,0.10)", background:"rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950 }}>Open by user_id (auth uid)</div>
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>Uses player_auth_links(user_id → player_id).</div>
          <div style={{ display:"flex", gap: 10, marginTop: 10, flexWrap:"wrap" }}>
            <input
              value={userId}
              onChange={(e)=>setUserId(e.target.value)}
              placeholder="user_id (uuid)"
              style={{ flex: 1, minWidth: 320, padding:"10px 12px", borderRadius: 12, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(0,0,0,0.25)", color:"rgba(255,255,255,0.92)" }}
            />
            <button className="zombie-btn" type="button" onClick={() => openByUserId(userId)}>Resolve + Open</button>
          </div>
        </div>

        <div style={{ border:"1px solid rgba(255,255,255,0.10)", background:"rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950 }}>Search players</div>
          <div style={{ display:"flex", gap: 10, marginTop: 10, flexWrap:"wrap" }}>
            <input
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              placeholder="Search by name or game name…"
              style={{ flex: 1, minWidth: 320, padding:"10px 12px", borderRadius: 12, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(0,0,0,0.25)", color:"rgba(255,255,255,0.92)" }}
            />
            <button className="zombie-btn" type="button" onClick={searchPlayers}>Search</button>
            <button className="zombie-btn" type="button" onClick={() => setRows([])}>Clear</button>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap: 8, marginTop: 12 }}>
            {rows.map((p) => (
              <button key={p.id} className="zombie-btn" type="button" style={{ textAlign:"left", whiteSpace:"normal" }} onClick={() => open(p.id)}>
                <div style={{ fontWeight: 900 }}>{s(p.game_name || p.name || "Player")}</div>
                <div style={{ opacity: 0.72, fontSize: 12 }}>player_id: {p.id}</div>
              </button>
            ))}
            {!rows.length ? <div style={{ opacity: 0.75, fontSize: 12 }}>No results.</div> : null}
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
