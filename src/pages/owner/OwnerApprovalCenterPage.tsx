import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";

import ApprovalsPane from "./OwnerAccessRequestsPage";
import AssignPane from "./OwnerMembershipManagerPage";
import { resolvePlayerIdFromUserId } from "../../lib/playerIdentity";

function Pill(props: { text: string }) {
  return (
    <div
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: "0.04em",
        opacity: 0.92,
      }}
    >
      {props.text}
    </div>
  );
}

function HeroAction(props: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      className="zombie-btn"
      style={{
        padding: "12px 14px",
        fontWeight: 900,
        minWidth: 180,
        boxShadow: props.primary ? "0 10px 30px rgba(0,0,0,0.35)" : "none",
      }}
      onClick={props.onClick}
      type="button"
    >
      {props.label}
    </button>
  );
}

function FeatureCard(props: {
  icon: string;
  title: string;
  text: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div
      className="zombie-card"
      style={{
        padding: 18,
        minHeight: 220,
        display: "grid",
        gap: 10,
        alignContent: "start",
        background: "linear-gradient(180deg, rgba(18,22,28,0.96), rgba(10,12,16,0.94))",
      }}
    >
      <div style={{ fontSize: 28 }}>{props.icon}</div>
      <div style={{ fontSize: 20, fontWeight: 950 }}>{props.title}</div>
      <div style={{ opacity: 0.84, lineHeight: 1.6 }}>{props.text}</div>
      <div>
        <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: 900 }} onClick={props.onClick} type="button">
          {props.cta}
        </button>
      </div>
    </div>
  );
}

function CategoryTile(props: { title: string; text: string }) {
  return (
    <div
      className="zombie-card"
      style={{
        padding: 14,
        minHeight: 120,
        display: "grid",
        gap: 8,
        background: "rgba(0,0,0,0.30)",
      }}
    >
      <div style={{ fontWeight: 950, fontSize: 16 }}>{props.title}</div>
      <div style={{ opacity: 0.8, lineHeight: 1.55 }}>{props.text}</div>
    </div>
  );
}

function StepRow(props: { step: string; title: string; text: string }) {
  return (
    <div
      className="zombie-card"
      style={{
        padding: 16,
        display: "grid",
        gridTemplateColumns: "110px 1fr",
        gap: 14,
        alignItems: "start",
      }}
    >
      <div
        style={{
          borderRadius: 12,
          padding: "10px 12px",
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.04)",
          fontWeight: 950,
          textAlign: "center",
        }}
      >
        {props.step}
      </div>
      <div>
        <div style={{ fontWeight: 950, fontSize: 18 }}>{props.title}</div>
        <div style={{ opacity: 0.82, marginTop: 6, lineHeight: 1.6 }}>{props.text}</div>
      </div>
    </div>
  );
}

function MiniStat(props: { label: string; value: string; sub: string }) {
  return (
    <div
      className="zombie-card"
      style={{
        padding: 14,
        minHeight: 112,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ opacity: 0.72, fontSize: 11, fontWeight: 900, letterSpacing: "0.12em" }}>{props.label}</div>
      <div style={{ fontSize: 24, fontWeight: 950 }}>{props.value}</div>
      <div style={{ opacity: 0.72, fontSize: 12 }}>{props.sub}</div>
    </div>
  );
}

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
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/ops")}>Ops</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/dossier")}>Dossier Lookup</button>
        </div>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        <div
          className="zombie-card"
          style={{
            padding: 22,
            background: "linear-gradient(180deg, rgba(16,20,26,0.98), rgba(8,10,14,0.94))",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Pill text="APPROVAL CENTER" />
            <Pill text="REQUEST REVIEW" />
            <Pill text="MEMBERSHIP ASSIGNMENT" />
            <Pill text="RLS ENFORCED" />
          </div>

          <div style={{ fontSize: 34, fontWeight: 950, marginTop: 14, lineHeight: 1.05 }}>
            Owner Approval Hub
          </div>

          <div style={{ opacity: 0.86, marginTop: 12, lineHeight: 1.7, maxWidth: 980, fontSize: 15 }}>
            A cleaner front door for access approvals and role assignment. The actual approval and membership tools stay exactly the same —
            this just gives you a faster, clearer owner-facing layout.
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
            <HeroAction primary label="🧾 Both Panels" onClick={() => setTab("both")} />
            <HeroAction label="✅ Approvals Only" onClick={() => setTab("approve")} />
            <HeroAction label="🪪 Assign Only" onClick={() => setTab("assign")} />
            <HeroAction label="🛰️ Owner Ops" onClick={() => nav("/owner/ops")} />
            <HeroAction label="📁 Dossier Lookup" onClick={() => nav("/owner/dossier")} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <MiniStat label="MODE" value={tab.toUpperCase()} sub="Current approval layout" />
          <MiniStat label="FLOW" value="2 STEP" sub="Approve then assign" />
          <MiniStat label="ACCESS" value="OWNER" sub="Restricted workflow" />
          <MiniStat label="SECURITY" value="RLS" sub="Backend access enforced" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          <FeatureCard
            icon="✅"
            title="Approvals Queue"
            text="Review and approve incoming access requests without changing the current approval code or queue behavior."
            cta="Show Approvals"
            onClick={() => setTab("approve")}
          />
          <FeatureCard
            icon="🪪"
            title="Alliance Assignment"
            text="Assign alliance access and roles on the same page after approval using the existing assignment workflow."
            cta="Show Assign"
            onClick={() => setTab("assign")}
          />
          <FeatureCard
            icon="📁"
            title="Dossier Jump"
            text="Open a dossier quickly by user_id or player_id when you need more context before approving or assigning."
            cta="Open Dossier Lookup"
            onClick={() => nav("/owner/dossier")}
          />
          <FeatureCard
            icon="🛰️"
            title="Owner Ops"
            text="Jump out to owner operations tools when you need to leave the approval workflow and manage something else."
            cta="Open Ops"
            onClick={() => nav("/owner/ops")}
          />
        </div>

        <div
          className="zombie-card"
          style={{
            padding: 18,
            background: "linear-gradient(180deg, rgba(14,16,20,0.96), rgba(8,10,14,0.92))",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 950 }}>Workflow summary</div>
          <div style={{ opacity: 0.8, marginTop: 8, lineHeight: 1.6 }}>
            The workflow remains the same: approve the request, assign the alliance and role, and then verify dossier context if needed.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 14 }}>
            <CategoryTile title="Approve Requests" text="Use the current approvals pane exactly as before." />
            <CategoryTile title="Assign Roles" text="Use the current membership manager exactly as before." />
            <CategoryTile title="Resolve Identity" text="Jump to dossier using user_id or player_id for verification." />
            <CategoryTile title="No Flow Change" text="Only the surrounding layout changes — not the approval logic." />
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <StepRow
            step="STEP 1"
            title="Review the request"
            text="Open the approvals pane and confirm the request you want to process."
          />
          <StepRow
            step="STEP 2"
            title="Assign membership and role"
            text="Use the assign pane to finish alliance placement and role access using the existing tools."
          />
          <StepRow
            step="STEP 3"
            title="Open dossier if needed"
            text="Jump to the player dossier by user_id or player_id when you need more context before finishing."
          />
        </div>

        <div
          className="zombie-card"
          style={{
            padding: 16,
            background: "rgba(0,0,0,0.28)",
          }}
        >
          <div style={{ fontWeight: 950, fontSize: 18 }}>Dossier Jump</div>
          <div style={{ opacity: 0.78, fontSize: 12, marginTop: 6 }}>
            Open any player dossier by user_id or player_id.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, marginTop: 12, alignItems: "center" }}>
            <input
              value={dossierUserId}
              onChange={(e) => setDossierUserId(e.target.value)}
              placeholder="user_id (auth uid)"
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.25)",
                color: "rgba(255,255,255,0.92)",
              }}
            />
            <input
              value={dossierPlayerId}
              onChange={(e) => setDossierPlayerId(e.target.value)}
              placeholder="player_id (uuid)"
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.25)",
                color: "rgba(255,255,255,0.92)",
              }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
            <div className="zombie-card" style={{ padding: 12 }}>
              <div style={{ fontWeight: 950, marginBottom: 8, fontSize: 18 }}>✅ Approvals</div>
              <div style={{ opacity: 0.72, fontSize: 12, marginBottom: 10 }}>
                Current approvals workflow, unchanged.
              </div>
              <ApprovalsPane />
            </div>
          ) : null}

          {tab !== "approve" ? (
            <div className="zombie-card" style={{ padding: 12 }}>
              <div style={{ fontWeight: 950, marginBottom: 8, fontSize: 18 }}>🪪 Assign</div>
              <div style={{ opacity: 0.72, fontSize: 12, marginBottom: 10 }}>
                Current membership assignment workflow, unchanged.
              </div>
              <AssignPane />
            </div>
          ) : null}
        </div>
      </div>
    </CommandCenterShell>
  );
}
