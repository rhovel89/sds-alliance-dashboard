import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

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

function SectionCard(props: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div
      className="zombie-card"
      style={{
        padding: 16,
        background: "rgba(0,0,0,0.22)",
      }}
    >
      <div style={{ fontWeight: 950, fontSize: 18 }}>{props.title}</div>
      {props.subtitle ? (
        <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4, marginBottom: 12 }}>{props.subtitle}</div>
      ) : (
        <div style={{ height: 12 }} />
      )}
      {props.children}
    </div>
  );
}

export default function OwnerApprovalCenterPage() {
  const nav = useNavigate();

  const [tab, setTab] = useState<"approve" | "assign" | "both">("both");
  const [dossierUserId, setDossierUserId] = useState("");
  const [dossierPlayerId, setDossierPlayerId] = useState("");

  async function openDossierByUserId(uid: string) {
    const u = String(uid || "").trim();
    if (!u) {
      alert("Enter a user_id.");
      return;
    }

    const pid = await resolvePlayerIdFromUserId(u);
    if (!pid) {
      alert("No player_id found for that user_id.");
      return;
    }

    nav(`/dossier/${encodeURIComponent(pid)}`);
  }

  function openDossierByPlayerId(pid: string) {
    const p = String(pid || "").trim();
    if (!p) {
      alert("Enter a player_id.");
      return;
    }

    nav(`/dossier/${encodeURIComponent(p)}`);
  }

  return (
    <div
      style={{
        width: "calc(100vw - 32px)",
        maxWidth: "none",
        marginLeft: "calc(50% - 50vw + 16px)",
        marginRight: 0,
        padding: 16,
        display: "grid",
        gap: 12,
        boxSizing: "border-box",
      }}
    >
      <div
        className="zombie-card"
        style={{
          padding: 20,
          background: "linear-gradient(180deg, rgba(16,20,26,0.98), rgba(8,10,14,0.94))",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ minWidth: 280 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <Pill text="APPROVALS" />
              <Pill text="ASSIGNMENTS" />
              <Pill text="RLS ENFORCED" />
            </div>

            <div style={{ fontSize: 32, fontWeight: 950, lineHeight: 1.05 }}>
              Owner Approval Hub
            </div>

            <div style={{ opacity: 0.84, marginTop: 10, lineHeight: 1.7, maxWidth: 860 }}>
              Approve requests, assign alliance access, and jump into dossiers from one full-width workspace.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" type="button" onClick={() => nav("/owner")} style={{ padding: "10px 12px" }}>
              Owner
            </button>
            <button className="zombie-btn" type="button" onClick={() => nav("/owner/ops")} style={{ padding: "10px 12px" }}>
              Ops
            </button>
            <button className="zombie-btn" type="button" onClick={() => nav("/owner/dossier")} style={{ padding: "10px 12px" }}>
              Dossier Lookup
            </button>
            <button className="zombie-btn" type="button" onClick={() => nav("/owner/requests")} style={{ padding: "10px 12px" }}>
              Requests
            </button>
          </div>
        </div>
      </div>

      <SectionCard title="View mode" subtitle="Switch between approvals, assignments, or both.">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="zombie-btn" type="button" onClick={() => setTab("both")} style={{ padding: "10px 12px", fontWeight: tab === "both" ? 900 : 700 }}>
            Both
          </button>
          <button className="zombie-btn" type="button" onClick={() => setTab("approve")} style={{ padding: "10px 12px", fontWeight: tab === "approve" ? 900 : 700 }}>
            Approvals
          </button>
          <button className="zombie-btn" type="button" onClick={() => setTab("assign")} style={{ padding: "10px 12px", fontWeight: tab === "assign" ? 900 : 700 }}>
            Assign
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Dossier jump" subtitle="Open a player dossier by user_id or player_id.">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 10,
            alignItems: "center",
          }}
        >
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
              minWidth: 0,
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
              minWidth: 0,
            }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="zombie-btn" type="button" onClick={() => openDossierByUserId(dossierUserId)} style={{ padding: "10px 12px" }}>
              Resolve + Open
            </button>
            <button className="zombie-btn" type="button" onClick={() => openDossierByPlayerId(dossierPlayerId)} style={{ padding: "10px 12px" }}>
              Open
            </button>
          </div>
        </div>
      </SectionCard>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: tab === "both" ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr)",
          gap: 12,
          alignItems: "start",
          width: "100%",
        }}
      >
        {tab !== "assign" ? (
          <SectionCard title="✅ Approvals" subtitle="Review and approve incoming requests.">
            <ApprovalsPane />
          </SectionCard>
        ) : null}

        {tab !== "approve" ? (
          <SectionCard title="🪪 Assign" subtitle="Assign alliance access and role after approval.">
            <AssignPane />
          </SectionCard>
        ) : null}
      </div>

      <SectionCard title="Workflow" subtitle="Keep the approval flow simple and fast.">
        <div style={{ opacity: 0.82, lineHeight: 1.7 }}>
          1) Approve the request. 2) Assign alliance and role. 3) Open dossier only when extra context is needed.
        </div>
      </SectionCard>
    </div>
  );
}

