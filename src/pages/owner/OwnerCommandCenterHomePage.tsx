import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";
import LegacyOwnerHome from "../pages/owner/OwnerHomePage";

export default function OwnerCommandCenterHomePage() {
  const nav = useNavigate();
  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);
  function onSelectModule(k: string) { const to = cc.find(m => m.key === k)?.to; if (to) nav(to); }

  return (
    <CommandCenterShell
      title="Owner Command"
      subtitle="Authority • access • ops • survival"
      modules={modules}
      activeModuleKey="owner"
      onSelectModule={onSelectModule}
    >
      <LegacyOwnerHome />
    </CommandCenterShell>
  );
}
