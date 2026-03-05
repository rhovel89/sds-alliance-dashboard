import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";

// Preserve ALL existing State 789 functionality by rendering the legacy page inside the shell.
import LegacyState789DashboardPage from "./State789DashboardPage";

export default function State789WarRoomPage() {
  const nav = useNavigate();

  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(
    () => cc.map(({ key, label, hint }) => ({ key, label, hint })),
    [cc]
  );

  function onSelectModule(k: string) {
    const to = cc.find((m) => m.key === k)?.to;
    if (to) nav(to);
  }

  return (
    <CommandCenterShell
      title="State 789 — War Room"
      subtitle="Bloody command center • live ops • fast decisions"
      modules={modules}
      activeModuleKey="state789"
      onSelectModule={onSelectModule}
    >
      <LegacyState789DashboardPage />
    </CommandCenterShell>
  );
}
