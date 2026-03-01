import React from "react";
import OwnerFlowShell, { FlowStep } from "../../components/owner/OwnerFlowShell";
import OwnerAllianceDirectoryEditorPage from "../pages/owner/OwnerAllianceDirectoryEditorPage";
import OwnerAllianceDirectorySyncPage from "../pages/owner/OwnerAllianceDirectorySyncPage";
import OwnerAlliancesPage from "../pages/owner/OwnerAlliancesPage";
import OwnerMembershipsPage from "../pages/owner/OwnerMembershipsPage";

export default function OwnerAllianceOpsFlowPage() {
  const steps: FlowStep[] = [
    {
      key: "directory",
      title: "Alliance Directory",
      desc: "Add/edit/remove alliance codes.",
      openRoute: "/owner/alliance-directory",
      element: (<OwnerAllianceDirectoryEditorPage />)
    },    {
      key: "sync",
      title: "Directory Sync",
      desc: "Sync directory so app stays consistent.",
      openRoute: "/owner/directory-sync",
      element: (<OwnerAllianceDirectorySyncPage />)
    },    {
      key: "alliances",
      title: "Alliances Admin",
      desc: "Alliance records admin.",
      openRoute: "/owner/alliances",
      element: (<OwnerAlliancesPage />)
    },    {
      key: "memberships",
      title: "Memberships",
      desc: "Who belongs to which alliance(s).",
      openRoute: "/owner/memberships",
      element: (<OwnerMembershipsPage />)
    },    {
      key: "permissions",
      title: "Permissions",
      desc: "Permissions that affect alliances too.",
      openRoute: "/owner/permissions-matrix-v3",
      element: (
        <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>This step is available, but I couldn't auto-embed it.</div>
          <a href="/owner/permissions-matrix-v3" style={{ textDecoration: "none" }}>
            <button type="button" style={{ padding: "10px 12px", borderRadius: 12 }}>Open Permissions</button>
          </a>
        </div>
      )
    },
  ];

  return (
    <OwnerFlowShell
      title="🧟 Alliance Ops Flow"
      subtitle="One page flow: Directory → Sync → Alliances → Memberships → Permissions."
      steps={steps}
    />
  );
}
