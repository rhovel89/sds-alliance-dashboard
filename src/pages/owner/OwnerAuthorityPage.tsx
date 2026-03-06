import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import MetricTiles from "../../components/commandcenter/MetricTiles";
import ThreatStrip from "../../components/commandcenter/ThreatStrip";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";

export default function OwnerAuthorityPage() {
  const nav = useNavigate();
  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);

  const [status, setStatus] = useState<string>("");
  const [uid, setUid] = useState<string>("");
  const [playerId, setPlayerId] = useState<string>("");
  const [isAdminDb, setIsAdminDb] = useState<string>("(unknown)");
  const [alliances, setAlliances] = useState<any[]>([]);
  const [stateStaffRows, setStateStaffRows] = useState<any[]>([]);

  function onSelectModule(k: string) {
    const to = cc.find((m) => m.key === k)?.to;
    if (to) nav(to);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("");

      const u = await supabase.auth.getUser();
      const id = u.data?.user?.id ? String(u.data.user.id) : "";
      if (!cancelled) setUid(id);

      // 1) canonical player id (RPC if exists)
      try {
        const r = await supabase.rpc("current_player_id");
        if (!cancelled && !r.error && r.data) setPlayerId(String(r.data));
      } catch {}

      // 2) is_app_admin() check (DB truth)
      try {
        const a = await supabase.rpc("is_app_admin");
        if (!cancelled) setIsAdminDb(a.error ? "(rpc missing)" : String(!!a.data));
      } catch {
        if (!cancelled) setIsAdminDb("(rpc missing)");
      }

      // 3) my alliances (identity view)
      try {
        const m = await supabase.from("my_player_alliances").select("*").limit(200);
        if (!cancelled && !m.error) setAlliances((m.data || []) as any[]);
      } catch {}

      // 4) state staff rows (if table exists / RLS permits)
      try {
        const s = await supabase.from("state_achievement_access").select("*").limit(50);
        if (!cancelled && !s.error) setStateStaffRows((s.data || []) as any[]);
      } catch {}

      if (!cancelled) setStatus("");
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const metrics = useMemo(() => [
    { label: "Auth UID", value: uid ? "OK" : "NONE", hint: uid ? uid : "not signed in" },
    { label: "current_player_id()", value: playerId ? "OK" : "NONE", hint: playerId || "missing mapping" },
    { label: "DB is_app_admin()", value: isAdminDb, hint: "true = backend bypass enabled" },
    { label: "Alliances", value: String(alliances.length), hint: "my_player_alliances rows" },
  ], [uid, playerId, isAdminDb, alliances.length]);

  return (
    <CommandCenterShell
      title="Authority Console"
      subtitle="RLS truth • identity truth • owner verification"
      modules={modules}
      activeModuleKey="authority"
      onSelectModule={onSelectModule}
      topRight={
        <button className="zombie-btn" type="button" onClick={() => window.location.reload()}>
          Reload
        </button>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <ThreatStrip
          threat={isAdminDb === "true" ? "GREEN" : "AMBER"}
          note={isAdminDb === "true" ? "Owner bypass active in DB (RLS)" : "Bypass not active yet — apply SQL migration in Supabase"}
          right={
            <div style={{ display: "flex", gap: 8 }}>
              <button className="zombie-btn" type="button" onClick={() => nav("/owner/ops")}>Ops Console</button>
              <button className="zombie-btn" type="button" onClick={() => nav("/state/789/threads")}>Threads</button>
            </div>
          }
        />

        <MetricTiles tiles={metrics} />

        {status ? <div style={{ opacity: 0.9, fontSize: 12 }}>{status}</div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
          <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 950, fontSize: 14 }}>My Alliances (identity view)</div>
            <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>Source: my_player_alliances</div>
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              {alliances.map((a: any, i) => (
                <div key={String(a.id || i)} style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.18)", borderRadius: 12, padding: 10 }}>
                  <div style={{ fontWeight: 900 }}>{String(a.alliance_code || a.alliance_id || "Alliance")}</div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>Role: {String(a.role || "")}</div>
                </div>
              ))}
              {!alliances.length ? <div style={{ opacity: 0.7, fontSize: 12 }}>No alliances found via identity view.</div> : null}
            </div>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 950, fontSize: 14 }}>State Staff Rows</div>
            <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>Source: state_achievement_access (if present)</div>
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              {stateStaffRows.map((s: any, i) => (
                <div key={String(s.id || i)} style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.18)", borderRadius: 12, padding: 10 }}>
                  <div style={{ fontWeight: 900 }}>State: {String(s.state_code || "")}</div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>User: {String(s.user_id || "")}</div>
                </div>
              ))}
              {!stateStaffRows.length ? <div style={{ opacity: 0.7, fontSize: 12 }}>No staff rows visible (or table missing).</div> : null}
            </div>
          </div>
        </div>
      </div>
    </CommandCenterShell>
  );
}
