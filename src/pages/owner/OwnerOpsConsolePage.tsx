import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import BroadcastHeader from "../../components/commandcenter/BroadcastHeader";
import ThreatStrip from "../../components/commandcenter/ThreatStrip";
import MetricTiles from "../../components/commandcenter/MetricTiles";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";

export default function OwnerOpsConsolePage() {
  const nav = useNavigate();

  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);

  function onSelectModule(k: string) {
    const to = cc.find((m) => m.key === k)?.to;
    if (to) nav(to);
  }

  const metrics = useMemo(() => [
    { label: "Mode", value: "OPS CONSOLE", hint: "Guided flows (no duplicates)" },
    { label: "Enforcement", value: "RLS", hint: "Supabase policies enforce access" },
    { label: "Dispatch", value: "DISCORD", hint: "Queue worker sends notifications" },
    { label: "State", value: "MULTI", hint: "Multi-state + multi-alliance" },
  ], []);

  return (
    <CommandCenterShell
      title="Owner Ops Console"
      subtitle="Guided ops • approvals • roles • dispatch"
      modules={modules}
      activeModuleKey="ops"
      onSelectModule={onSelectModule}
      topRight={
        <div style={{ display: "flex", gap: 8 }}>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/access-control")}>
            Access Control
          </button>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner")}>
            Owner Command
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <BroadcastHeader
          title="OPS COMMAND"
          subtitle="Approve, assign, and dispatch. Keep it fast. Keep it clean."
          right={
            <div style={{ display: "flex", gap: 8 }}>
              <button className="zombie-btn" type="button" onClick={() => nav("/owner/player-ops")}>Player Ops</button>
              <button className="zombie-btn" type="button" onClick={() => nav("/owner/alliance-ops")}>Alliance Ops</button>
            </div>
          }
        />

        <ThreatStrip
          threat="AMBER"
          note="One ops hub. No duplicated flows. UI helps; RLS enforces."
          right={
            <button className="zombie-btn" type="button" onClick={() => nav("/state/789/achievements")}>
              Dossier (Achievements)
            </button>
          }
        />

        <MetricTiles tiles={metrics} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
          <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 950, letterSpacing: 0.4, textTransform: "uppercase", fontSize: 12 }}>Player Ops</div>
            <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>
              Intake → approval → assign alliances/roles. Fixes stale membership via canonical identity.
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <button className="zombie-btn" type="button" onClick={() => nav("/owner/player-ops")}>Open Player Ops</button>
              <button className="zombie-btn" type="button" onClick={() => nav("/owner/access-control")}>Permissions</button>
            </div>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 950, letterSpacing: 0.4, textTransform: "uppercase", fontSize: 12 }}>Alliance Ops</div>
            <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>
              Create/manage alliances, roles, and dashboards. (No monolith backend; Supabase only.)
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <button className="zombie-btn" type="button" onClick={() => nav("/owner/alliance-ops")}>Open Alliance Ops</button>
              <button className="zombie-btn" type="button" onClick={() => nav("/dashboard")}>Go Dashboard</button>
            </div>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 950, letterSpacing: 0.4, textTransform: "uppercase", fontSize: 12 }}>Dossier Dispatch</div>
            <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>
              Achievements dossier sheet → export PNG → queue to Discord.
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <button className="zombie-btn" type="button" onClick={() => nav("/state/789/achievements")}>Open Dossier</button>
              <button className="zombie-btn" type="button" onClick={() => nav("/state/789")}>State War Room</button>
            </div>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 950, letterSpacing: 0.4, textTransform: "uppercase", fontSize: 12 }}>Access Control</div>
            <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>
              RLS is the law. UI is a hint. Manage permissions safely.
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <button className="zombie-btn" type="button" onClick={() => nav("/owner/access-control")}>Open Access Control</button>
              <button className="zombie-btn" type="button" onClick={() => nav("/owner")}>Owner Home</button>
            </div>
          </div>
        </div>
      </div>
    </CommandCenterShell>
  );
}
