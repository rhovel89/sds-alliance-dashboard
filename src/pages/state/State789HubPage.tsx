import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import BroadcastHeader from "../../components/commandcenter/BroadcastHeader";
import ThreatStrip from "../../components/commandcenter/ThreatStrip";
import MetricTiles from "../../components/commandcenter/MetricTiles";
import ActionDrawer from "../../components/commandcenter/ActionDrawer";
import OpsFeedPanel from "../../components/commandcenter/OpsFeedPanel";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";

// Legacy war room (keep all features)
import State789WarRoomPage from "./State789WarRoomPage";

export default function State789HubPage() {
  const nav = useNavigate();
  const stateCode = "789";

  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);

  const [legacyOpen, setLegacyOpen] = useState(false);

  function onSelectModule(k: string) {
    const to = cc.find((m) => m.key === k)?.to;
    if (to) nav(to);
  }

  const tiles = useMemo(() => [
    { label: "State", value: "789", hint: "Primary war room" },
    { label: "Mode", value: "HUB", hint: "Clean launch grid" },
    { label: "Comms", value: "THREADS", hint: "In-app + Discord notify" },
    { label: "Intel", value: "DOSSIER", hint: "Achievements export" },
  ], []);

  return (
    <CommandCenterShell
      title="State 789 — Hub"
      subtitle="Launch grid • live ops feed • legacy preserved"
      modules={modules}
      activeModuleKey="state789"
      onSelectModule={onSelectModule}
      topRight={
        <div style={{ display: "flex", gap: 8 }}>
          <button className="zombie-btn" type="button" onClick={() => setLegacyOpen(true)}>
            Open Legacy Panels
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <BroadcastHeader
          title="STATE 789 COMMAND"
          subtitle="Fast launch. Zero duplicates. No feature loss."
          right={
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="zombie-btn" type="button" onClick={() => nav("/state/789/threads")}>Threads</button>
              <button className="zombie-btn" type="button" onClick={() => nav("/state/789/achievements")}>Dossier</button>
              <button className="zombie-btn" type="button" onClick={() => nav("/dashboard")}>Dashboard</button>
            </div>
          }
        />

        <ThreatStrip
          threat="GREEN"
          note="Hub mode active. Legacy preserved in drawer."
          right={<button className="zombie-btn" type="button" onClick={() => nav(`/state/${stateCode}/threads`)}>Open Comms</button>}
        />

        <MetricTiles tiles={tiles} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
          <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 950 }}>🧟 Threads</div>
            <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>In-app threads + Discord notify.</div>
            <button className="zombie-btn" type="button" style={{ marginTop: 10 }} onClick={() => nav("/state/789/threads")}>
              Open Threads
            </button>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 950 }}>📄 Achievements Dossier</div>
            <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>PNG export + queue to Discord.</div>
            <button className="zombie-btn" type="button" style={{ marginTop: 10 }} onClick={() => nav("/state/789/achievements")}>
              Open Dossier
            </button>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 950 }}>📅 Calendar</div>
            <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>Alliance calendars live under /dashboard/&lt;ALLIANCE&gt;/calendar.</div>
            <button className="zombie-btn" type="button" style={{ marginTop: 10 }} onClick={() => nav("/dashboard")}>
              Go to Dashboard
            </button>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 950 }}>🗺️ HQ Map</div>
            <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>HQ layout unchanged (you asked).</div>
            <button className="zombie-btn" type="button" style={{ marginTop: 10 }} onClick={() => nav("/dashboard")}>
              Open HQ via Dashboard
            </button>
          </div>
        </div>

        <OpsFeedPanel stateCode={stateCode} />
      </div>

      <ActionDrawer open={legacyOpen} title="Legacy State 789 Panels" onClose={() => setLegacyOpen(false)}>
        <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 10 }}>
          Legacy UI is preserved here (no feature loss). Close when done.
        </div>
        <State789WarRoomPage />
      </ActionDrawer>
    </CommandCenterShell>
  );
}
