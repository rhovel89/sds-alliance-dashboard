import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";

import ApprovalsPane from "./OwnerAccessRequestsPage";
import AssignPane from "./OwnerMembershipManagerPage";
import { resolvePlayerIdFromUserId } from "../../lib/playerIdentity";

export default function OwnerApprovalCenterPage() {
  const nav = useNavigate();
  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);
  function onSelectModule(k: string) {
    const to = cc.find((m) => m.key === k)?.to;
    if (to) nav(to);
  }

  const [tab, setTab] = useState<"approve" | "assign" | "both">("both");

  const [dossierUserId, setDossierUserId] = useState("");
  const [dossierPlayerId, setDossierPlayerId] = useState("");

  async function openDossierByUserId(uid: string) {
    const u = String(uid || "").trim();
    if (!u) { alert("Enter a user_id."); return; }
    const pid = await resolvePlayerIdFromUserId(u);
    if (!pid) { alert("No player_id found for that user_id."); return; }
    nav(`/dossier/${encodeURIComponent(pid)}`);
  }

  function openDossierByPlayerId(pid: string) {
    const p = String(pid || "").trim();
    if (!p) { alert("Enter a player_id."); return; }
    nav(`/dossier/${encodeURIComponent(p)}`);
  }

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
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/dossier")}>Dossier Lookup</button>
        </div>
      }
    >
      <div style={{ opacity: 0.78, fontSize: 12, marginBottom: 10 }}>
        Workflow: approve request → assign alliance/role → done. (Discord roles are UI only; Supabase RLS enforces access.)
      </div>

      <div style={{ border:"1px solid rgba(255,255,255,0.10)", background:"rgba(255,255,255,0.03)", borderRadius: 14, padding: 10, marginBottom: 12, maxWidth: 980 }}>
        <div style={{ fontWeight: 950 }}>Dossier Jump</div>
        <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>Open any player dossier by user_id or player_id.</div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap: 10, marginTop: 10, alignItems:"center" }}>
          <input
            value={dossierUserId}
            onChange={(e)=>setDossierUserId(e.target.value)}
            placeholder="user_id (auth uid)"
            style={{ padding:"10px 12px", borderRadius: 12, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(0,0,0,0.25)", color:"rgba(255,255,255,0.92)" }}
          />
          <input
            value={dossierPlayerId}
            onChange={(e)=>setDossierPlayerId(e.target.value)}
            placeholder="player_id (uuid)"
            style={{ padding:"10px 12px", borderRadius: 12, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(0,0,0,0.25)", color:"rgba(255,255,255,0.92)" }}
          />
          <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
            <button className="zombie-btn" type="button" onClick={() => openDossierByUserId(dossierUserId)}>Resolve + Open</button>
            <button className="zombie-btn" type="button" onClick={() => openDossierByPlayerId(dossierPlayerId)}>Open</button>
          </div>
        </div>
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

