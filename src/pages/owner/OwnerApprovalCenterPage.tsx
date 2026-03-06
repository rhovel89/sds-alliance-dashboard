import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";

import ApprovalsPane from "";
import AssignPane from "";

export default function OwnerApprovalCenterPage() {
  const nav = useNavigate();
  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);
  function onSelectModule(k: string) { const to = cc.find(m => m.key === k)?.to; if (to) nav(to); }

  const [tab, setTab] = useState<"approve" | "assign">("approve");

  return (
    <CommandCenterShell
      title="Owner Approval Center"
      subtitle="Approve + assign on one screen • no feature loss"
      modules={modules}
      activeModuleKey="owner"
      onSelectModule={onSelectModule}
      topRight={
        <div style={{ display:"flex", gap: 8 }}>
          <button className="zombie-btn" type="button" onClick={() => setTab("approve")}>Approvals</button>
          <button className="zombie-btn" type="button" onClick={() => setTab("assign")}>Assign</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/ops")}>Ops</button>
        </div>
      }
    >
      <div style={{ display:"grid", gridTemplateColumns:"1fr", gap: 12 }}>
        <div style={{ opacity: 0.75, fontSize: 12 }}>
          Workflow: approve request → assign alliance/role → done. RLS enforces all access.
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 12, alignItems:"start" }}>
          <div style={{ border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.03)", borderRadius: 14, padding: 10 }}>
            <div style={{ fontWeight: 950, marginBottom: 8 }}>Approve</div>
            {tab === "approve" ? <ApprovalsPane /> : <div style={{ opacity: 0.7 }}>Switch to Approvals tab.</div>}
          </div>

          <div style={{ border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.03)", borderRadius: 14, padding: 10 }}>
            <div style={{ fontWeight: 950, marginBottom: 8 }}>Assign</div>
            {tab === "assign" ? <AssignPane /> : <div style={{ opacity: 0.7 }}>Switch to Assign tab.</div>}
          </div>
        </div>
      </div>
    </CommandCenterShell>
  );
}
