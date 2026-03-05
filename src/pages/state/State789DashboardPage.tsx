import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import BroadcastHeader from "../../components/commandcenter/BroadcastHeader";
import ThreatStrip from "../../components/commandcenter/ThreatStrip";
import MetricTiles from "../../components/commandcenter/MetricTiles";
import ActionDrawer from "../../components/commandcenter/ActionDrawer";

import { getCommandCenterModules } from "../../components/commandcenter/ccModules";

type Threat = "GREEN" | "AMBER" | "RED";

export default function State789DashboardPage() {
  const nav = useNavigate();

  const cc = useMemo(() => getCommandCenterModules(), []);
  const shellModules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [threat, setThreat] = useState<Threat>("AMBER");

  const [allianceCode, setAllianceCode] = useState<string>("");

  function onSelectModule(k: string) {
    const to = cc.find((m) => m.key === k)?.to;
    if (to) nav(to);
  }

  const metrics = useMemo(
    () => [
      { label: "State", value: "789", hint: "Primary war room" },
      { label: "Status", value: threat, hint: "Operational threat level" },
      { label: "Realtime", value: "ONLINE", hint: "UI live • RLS enforced" },
      { label: "Intel", value: "Dossiers", hint: "Achievements + reports" },
    ],
    [threat]
  );

  function openAllianceDash(kind: "dash" | "calendar" | "hq") {
    const c = String(allianceCode || "").trim();
    if (!c) return;

    const code = encodeURIComponent(c.toUpperCase());
    if (kind === "dash") nav(`/dashboard/${code}`);
    if (kind === "calendar") nav(`/dashboard/${code}/calendar`);
    if (kind === "hq") nav(`/dashboard/${code}/hq-map`);
  }

  return (
    <CommandCenterShell chromeless
      title="State 789 — War Room"
      subtitle="Bloody command center • live ops • fast decisions"
      modules={shellModules}
      activeModuleKey="state789"
      onSelectModule={onSelectModule}
      topRight={
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            className="zombie-btn"
            onClick={() => setDrawerOpen(true)}
            style={{ whiteSpace: "nowrap" }}
          >
            + Quick Actions
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <BroadcastHeader
          title="STATE 789 COMMAND"
          subtitle="Briefing • Triage • Dispatch • Survive"
          right={
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button type="button" className="zombie-btn" onClick={() => nav("/state/789/achievements")}>
                Achievements
              </button>
              <button type="button" className="zombie-btn" onClick={() => nav("/owner/player-ops")}>
                Player Ops
              </button>
            </div>
          }
        />

        <ThreatStrip
          threat={threat}
          note="Command posture. Keep it moving. No duplicate flows."
          right={
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="zombie-btn" onClick={() => setThreat("GREEN")}>GREEN</button>
              <button type="button" className="zombie-btn" onClick={() => setThreat("AMBER")}>AMBER</button>
              <button type="button" className="zombie-btn" onClick={() => setThreat("RED")}>RED</button>
            </div>
          }
        />

        <MetricTiles tiles={metrics} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.4, textTransform: "uppercase", fontSize: 12 }}>Launch Alliance Ops</div>
            <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
              Jump to any alliance dashboard, calendar, or HQ map. (HQ layout stays as-is.)
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <input
                value={allianceCode}
                onChange={(e) => setAllianceCode(e.target.value)}
                placeholder="Alliance code (e.g. WOC)"
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(0,0,0,0.25)",
                  color: "rgba(255,255,255,0.92)",
                  minWidth: 180,
                }}
              />
              <button type="button" className="zombie-btn" onClick={() => openAllianceDash("dash")}>Open Dashboard</button>
              <button type="button" className="zombie-btn" onClick={() => openAllianceDash("calendar")}>Open Calendar</button>
              <button type="button" className="zombie-btn" onClick={() => openAllianceDash("hq")}>Open HQ Map</button>
            </div>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.4, textTransform: "uppercase", fontSize: 12 }}>Intel Dossiers</div>
            <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
              Achievements will become the “dossier sheet” export hub (PNG + Discord send).
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <button type="button" className="zombie-btn" onClick={() => nav("/state/789/achievements")}>Open Achievements</button>
              <button type="button" className="zombie-btn" onClick={() => nav("/owner/access-control")}>Access Control</button>
            </div>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.4, textTransform: "uppercase", fontSize: 12 }}>Ops Flows (No Duplicates)</div>
            <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
              Single guided flows. All enforcement stays in Supabase RLS.
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <button type="button" className="zombie-btn" onClick={() => nav("/owner/player-ops")}>Player Ops</button>
              <button type="button" className="zombie-btn" onClick={() => nav("/owner/alliance-ops")}>Alliance Ops</button>
              <button type="button" className="zombie-btn" onClick={() => nav("/owner")}>Owner Command</button>
            </div>
          </div>
        </div>
      </div>

      <ActionDrawer open={drawerOpen} title="Quick Actions" onClose={() => setDrawerOpen(false)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ opacity: 0.75, fontSize: 12 }}>
            These are safe launch points. Next pass will wire Discord send + calendar fixes + dossier exports.
          </div>

          <button type="button" className="zombie-btn" onClick={() => { setDrawerOpen(false); nav("/state/789/achievements"); }}>
            Open Achievements (Dossier)
          </button>

          <button type="button" className="zombie-btn" onClick={() => { setDrawerOpen(false); nav("/owner/player-ops"); }}>
            Player Ops (Intake + Approvals)
          </button>

          <button type="button" className="zombie-btn" onClick={() => { setDrawerOpen(false); nav("/owner/alliance-ops"); }}>
            Alliance Ops (Roles + Setup)
          </button>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 6, paddingTop: 10, opacity: 0.75, fontSize: 12 }}>
            Coming next: “Send Alert to Discord”, “Schedule Event”, “Export Dossier PNG”.
          </div>
        </div>
      </ActionDrawer>
    </CommandCenterShell>
  );
}

