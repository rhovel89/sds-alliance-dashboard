import React from "react";
import "./ownerOpsFlow.css";
import OwnerFlowShell, { FlowStep } from "../../components/owner/OwnerFlowShell";
import OwnerPlayerIntakePage from "./OwnerPlayerIntakePage";
import OwnerOnboardingQueuePage from "./OwnerOnboardingQueuePage";
import OwnerPlayersPage from "./OwnerPlayersPage";
import OwnerMembershipsPage from "./OwnerMembershipsPage";
import OwnerAccessControlPage from "./OwnerAccessControlPage";

export default function OwnerPlayerOpsFlowPage() {
  const steps: FlowStep[] = [
    {
      key: "intake",
      title: "Player Intake",
      desc: "Review & intake new players.",
      openRoute: "/owner/player-intake",
      element: (<OwnerPlayerIntakePage />)
    },    {
      key: "onboarding",
      title: "Onboarding Queue",
      desc: "Approve/provision access.",
      openRoute: "/owner/onboarding-queue",
      element: (<OwnerOnboardingQueuePage />)
    },    {
      key: "players",
      title: "Players",
      desc: "Player records + lookups.",
      openRoute: "/owner/players",
      element: (<OwnerPlayersPage />)
    },    {
      key: "memberships",
      title: "Memberships",
      desc: "Assign alliances + roles.",
      openRoute: "/owner/memberships",
      element: (<OwnerMembershipsPage />)
    },    {
      key: "permissions",
      title: "Permissions",
      desc: "Grant per-player permissions.",
      openRoute: "/owner/permissions-matrix-v3",
      element: (
        <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>This step is available, but I couldn't auto-embed it.</div>
          <a href="/owner/permissions-matrix-v3" style={{ textDecoration: "none" }}>
            <button type="button" style={{ padding: "10px 12px", borderRadius: 12 }}>Open Permissions</button>
          </a>
        </div>
      )
    },    {
      key: "scoped",
      title: "Access Control",
      desc: "Alliance/state scoped permissions.",
      openRoute: "/owner/access-control",
      element: (<OwnerAccessControlPage />)
    },
  ];

  return (
    <OwnerFlowShell
      title="🧟 Player Ops Flow"
      subtitle="One page flow: Intake → Approve → Memberships → Permissions. (No extra links.)"
      steps={steps}
    />
  );
}


