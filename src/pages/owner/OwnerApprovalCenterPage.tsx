import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";

import ApprovalsPane from "./OwnerAccessRequestsPage";
import AssignPane from "./OwnerMembershipManagerPage";

export default function OwnerApprovalCenterPage() {
  const nav = useNavigate();
  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);
  function onSelectModule(k: string) {
    const to = cc.find((m) => m.key === k)?.to;
    if (to) nav(to);
  }

  const [tab, setTab] = useState<"approve" | "assign" | "both">("both");

  return (
    <CommandCenterShell
      title="Owner Approval Center"
      subtitle="Approve + assign on one screen • RLS enforced"
      modules={modules}
      activeModuleKey="owner"
      onSelectModule={onSelectModule}
      topRight={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="zombie-btn" type="button" onClick={() => setTab("both")}>Both</button>
          <button className="zombie-btn" type="button" onClick={() => setTab("approve")}>Approvals</button>
          <button className="zombie-btn" type="button" onClick={() => setTab("assign")}>Assign</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/ops")}>Ops</button>
        </div>
      }
    >
      <div style={{ opacity: 0.78, fontSize: 12, marginBottom: 10 }}>
        Workflow: approve request → assign alliance/role → done. (Discord roles are UI only; Supabase RLS enforces access.)
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: tab === "both" ? "1fr 1fr" : "1fr",
          gap: 12,
          alignItems: "start",
        }}
      >
        {tab !== "assign" ? (
          <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 10 }}>
            <div style={{ fontWeight: 950, marginBottom: 8 }}>Approve</div>
            <ApprovalsPane />
          </div>
        ) : null}

        {tab !== "approve" ? (
          <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 10 }}>
            <div style={{ fontWeight: 950, marginBottom: 8 }}>Assign</div>
            <AssignPane />
          </div>
        ) : null}
      </div>
    </CommandCenterShell>
  );
}
