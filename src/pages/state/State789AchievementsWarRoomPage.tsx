import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";
import ActionDrawer from "../../components/commandcenter/ActionDrawer";
import StateAchievementsExportPanelV2 from "../../components/state/StateAchievementsExportPanelV2";

import LegacyAchievementsPage from "./State789AchievementsPage";

export default function State789AchievementsWarRoomPage() {
  const nav = useNavigate();
  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);

  const [drawerOpen, setDrawerOpen] = useState(false);

  function onSelectModule(k: string) {
    const to = cc.find((m) => m.key === k)?.to;
    if (to) nav(to);
  }

  return (
    <CommandCenterShell
      title="State 789 — Achievements Dossier"
      subtitle="Dossier sheets • exports • Discord dispatch"
      modules={modules}
      activeModuleKey="ach789"
      onSelectModule={onSelectModule}
      topRight={
        <button type="button" className="zombie-btn" onClick={() => setDrawerOpen(true)}>
          Export / Send
        </button>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 12, alignItems: "start" }}>
        <div style={{ minWidth: 0 }}>
          <LegacyAchievementsPage />
        </div>

      </div>
      <ActionDrawer open={drawerOpen} title="Dossier Export" onClose={() => setDrawerOpen(false)}>
        <StateAchievementsExportPanelV2 stateCode="789" />
      </ActionDrawer>
    </CommandCenterShell>
  );
}

