import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";
import { supabase } from "../../lib/supabaseClient";

function s(v: any) { return v === null || v === undefined ? "" : String(v); }

const ABS_ROUTES: string[] = [
  "/",
  "/alliances",
  "/alliances-v2",
  "/dashboard",
  "/dashboard/ME",
  "/debug",
  "/mail",
  "/mail-threads",
  "/mail-v2",
  "/me",
  "/me/dossier",
  "/me/hq-manager",
  "/onboarding",
  "/onboarding/pending",
  "/owner",
  "/owner/access-control",
  "/owner/access-control-legacy",
  "/owner/achievements/access",
  "/owner/achievements/config",
  "/owner/achievements/requests",
  "/owner/activity-feed",
  "/owner/alliance-directory",
  "/owner/alliance-ops",
  "/owner/alliances",
  "/owner/approval-center",
  "/owner/authority",
  "/owner/broadcast",
  "/owner/command-center",
  "/owner/data-vault",
  "/owner/directory-db",
  "/owner/directory-editor",
  "/owner/directory-sync",
  "/owner/discord",
  "/owner/discord-defaults",
  "/owner/discord-edge-test",
  "/owner/discord-mentions",
  "/owner/discord-mentions-tools",
  "/owner/discord-queue",
  "/owner/discord-send-log",
  "/owner/discord-templates",
  "/owner/discord-test-send",
  "/owner/dossier",
  "/owner/event-reminders",
  "/owner/event-types",
  "/owner/event-types-library",
  "/owner/jump",
  "/owner/links",
  "/owner/live-ops",
  "/owner/live-ops-db",
  "/owner/broadcast",
  "/owner/membership",
  "/owner/memberships",
  "/owner/onboarding-queue",
  "/owner/oneclick-provision",
  "/owner/oneclick-provision-plus",
  "/owner/ops",
  "/owner/permissions",
  "/owner/permissions-db",
  "/owner/permissions-matrix-v3-v2",
  "/owner/player-intake",
  "/owner/player-ops",
  "/owner/players",
  "/owner/players-link",
  "/owner/realtime-history",
  "/owner/requests",
  "/owner/requests-provision",
  "/owner/roles",
  "/owner/scheduled-sends",
  "/owner/select",
  "/owner/state",
  "/owner/state-achievement-catalog",
  "/owner/state-achievement-inbox",
  "/owner/state-achievement-requests",
  "/owner/state-achievements",
  "/owner/state-achievements-roster",
  "/owner/state-achievements/access",
  "/owner/state-achievements/admin",
  "/owner/state-achievements/queue",
  "/owner/route-check",
];

const DASH_CHILDREN: string[] = [
  "alerts",
  "announcements",
  "calendar",
  "discord-webhooks",
  "events",
  "guides",
  "hq-map",
  "permissions",
  "roster",
];

export default function OwnerRouteChecklistPage() {
  const nav = useNavigate();
  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);
  function onSelectModule(k: string) { const to = cc.find((m) => m.key === k)?.to; if (to) nav(to); }

  const [status, setStatus] = useState("");
  const [filter, setFilter] = useState("");
  const [playerId, setPlayerId] = useState<string>("00000000-0000-0000-0000-000000000000");
  const [alliances, setAlliances] = useState<string[]>(["WOC"]);

  const base = "https://state789.site";

  async function loadIdentity() {
    try {
      setStatus("");
      const me = await supabase.auth.getUser();
      const uid = s(me.data?.user?.id);
      if (!uid) return;

      const link = await supabase.from("player_auth_links").select("player_id").eq("user_id", uid).maybeSingle();
      const pid = s(link.data?.player_id);
      if (pid) setPlayerId(pid);

      if (pid) {
        const m = await supabase.from("player_alliances").select("alliance_code").eq("player_id", pid);
        const codes = (m.data || []).map((x: any) => s(x.alliance_code).toUpperCase()).filter(Boolean);
        if (codes.length) setAlliances(Array.from(new Set(codes)));
      }
    } catch (e: any) {
      setStatus(String(e?.message || e || "Load failed"));
    }
  }

  useEffect(() => { void loadIdentity(); }, []);

  const absLinks = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return ABS_ROUTES
      .map((p) => {
        // Replace dossier param route with real uuid variants you actually have
        if (p.startsWith("/dossier/")) return p;
        return p;
      })
      .filter((p) => (f ? p.toLowerCase().includes(f) : true))
      .map((p) => ({ path: p, url: base + p }));
  }, [filter]);

  const dashboardLinks = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const list: Array<{ path: string; url: string }> = [];
    const sample = alliances.length ? alliances[0] : "WOC";
    for (const child of DASH_CHILDREN) {
      const p = `/dashboard/${encodeURIComponent(sample)}/${child}`;
      if (!f || p.toLowerCase().includes(f)) list.push({ path: p, url: base + p });
    }
    return list;
  }, [filter, alliances]);

  const dossierLinks = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const list: Array<{ path: string; url: string }> = [];
    const p1 = `/me/dossier`;
    const p2 = `/dossier/${playerId}`;
    if (!f || p1.toLowerCase().includes(f)) list.push({ path: p1, url: base + p1 });
    if (!f || p2.toLowerCase().includes(f)) list.push({ path: p2, url: base + p2 });
    return list;
  }, [filter, playerId]);

  function openUrl(u: string) { window.open(u, "_blank", "noopener,noreferrer"); }
  async function copy(text: string) { try { await navigator.clipboard.writeText(text); setStatus("Copied ✅"); setTimeout(()=>setStatus(""), 800); } catch {} }

  return (
    <CommandCenterShell
      title="Route Checklist"
      subtitle="Open every corridor • confirm no console errors • fastest full-site QA"
      modules={modules}
      activeModuleKey="owner"
      onSelectModule={onSelectModule}
      topRight={
        <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner")}>Owner</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/dashboard")}>Dashboard</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/state/789")}>State 789</button>
        </div>
      }
    >
      {status ? (
        <div style={{ marginBottom: 10, border:"1px solid rgba(176,18,27,0.35)", background:"rgba(176,18,27,0.12)", borderRadius: 12, padding: 10 }}>
          {status}
        </div>
      ) : null}

      <div style={{ display:"flex", gap: 10, flexWrap:"wrap", alignItems:"center", marginBottom: 12 }}>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter routes (type: owner, dashboard, achievements, …)"
          style={{
            flex: 1, minWidth: 320,
            padding:"10px 12px", borderRadius: 12,
            border:"1px solid rgba(255,255,255,0.12)",
            background:"rgba(0,0,0,0.25)",
            color:"rgba(255,255,255,0.92)"
          }}
        />
        <button className="zombie-btn" type="button" onClick={() => loadIdentity()}>Refresh Identity</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(360px, 1fr))", gap: 12, alignItems:"start" }}>
        <div style={{ border:"1px solid rgba(255,255,255,0.10)", background:"rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950 }}>Identity Substitutions</div>
          <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
            playerId: <code>{playerId}</code><br />
            sample alliance: <code>{alliances[0] || "WOC"}</code>
          </div>

          <div style={{ marginTop: 10, display:"flex", flexDirection:"column", gap: 8 }}>
            {dossierLinks.map((x) => (
              <div key={x.path} style={{ display:"flex", gap: 8, alignItems:"center", justifyContent:"space-between" }}>
                <code style={{ opacity: 0.9 }}>{x.path}</code>
                <div style={{ display:"flex", gap: 8 }}>
                  <button className="zombie-btn" type="button" onClick={() => openUrl(x.url)}>Open</button>
                  <button className="zombie-btn" type="button" onClick={() => copy(x.url)}>Copy</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ border:"1px solid rgba(255,255,255,0.10)", background:"rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950 }}>Dashboard Corridors (expanded)</div>
          <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
            These are children of <code>/dashboard/&lt;ALLIANCE&gt;</code>
          </div>

          <div style={{ marginTop: 10, display:"flex", flexDirection:"column", gap: 8 }}>
            {dashboardLinks.map((x) => (
              <div key={x.path} style={{ display:"flex", gap: 8, alignItems:"center", justifyContent:"space-between" }}>
                <code style={{ opacity: 0.9 }}>{x.path}</code>
                <div style={{ display:"flex", gap: 8 }}>
                  <button className="zombie-btn" type="button" onClick={() => openUrl(x.url)}>Open</button>
                  <button className="zombie-btn" type="button" onClick={() => copy(x.url)}>Copy</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ border:"1px solid rgba(255,255,255,0.10)", background:"rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950 }}>Absolute Corridors</div>
          <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
            These routes start with <code>/</code> and are valid direct URLs.
          </div>

          <div style={{ marginTop: 10, display:"flex", flexDirection:"column", gap: 8 }}>
            {absLinks.map((x) => (
              <div key={x.path} style={{ display:"flex", gap: 8, alignItems:"center", justifyContent:"space-between" }}>
                <code style={{ opacity: 0.9 }}>{x.path}</code>
                <div style={{ display:"flex", gap: 8 }}>
                  <button className="zombie-btn" type="button" onClick={() => openUrl(x.url)}>Open</button>
                  <button className="zombie-btn" type="button" onClick={() => copy(x.url)}>Copy</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CommandCenterShell>
  );
}

