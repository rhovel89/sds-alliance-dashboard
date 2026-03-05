import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";
import LegacyMe from "";

export default function MeCommandCenterPage() {
  const nav = useNavigate();
  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);
  function onSelectModule(k: string) { const to = cc.find(m => m.key === k)?.to; if (to) nav(to); }

  return (
    <CommandCenterShell
      title="My Dossier"
      subtitle="Personal intel • quick ops • survival kit"
      modules={modules}
      activeModuleKey="me"
      onSelectModule={onSelectModule}
    >
      <LegacyMe />
    </CommandCenterShell>
  );
}
