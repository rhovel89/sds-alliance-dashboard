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

export default function OwnerApprovalCenterPage() {
  const nav = useNavigate();

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
    <div
      style={{
        width: "100%",
        maxWidth: "none",
        margin: 0,
        padding: 16,
        display: "grid",
        gap: 12,
      }}
    >
      <div
        className="zombie-card"
        style={{
          padding: 16,
          background: "linear-gradient(180deg, rgba(16,20,26,0.98), rgba(8,10,14,0.94))",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <Pill text="APPROVALS" />
              <Pill text="ASSIGNMENTS" />
              <Pill text="RLS ENFORCED" />
            </div>

            <div style={{ fontSize: 28, fontWeight: 950, lineHeight: 1.05 }}>
              Owner Approval Hub
            </div>

            <div style={{ opacity: 0.82, marginTop: 8, lineHeight: 1.6, maxWidth: 820 }}>
              Approve requests, assign alliance access, and jump into dossiers from one full-width workspace.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="zombie-btn" type="button" onClick={() => nav("/owner")}>Owner</button>
            <button className="zombie-btn" type="button" onClick={() => nav("/owner/ops")}>Ops</button>
            <button className="zombie-btn" type="button" onClick={() => nav("/owner/dossier")}>Dossier Lookup</button>
            <button className="zombie-btn" type="button" onClick={() => nav("/owner/requests")}>Requests</button>
          </div>
        </div>
      </div>

      <div
        className="zombie-card"
        style={{
          padding: 14,
          background: "rgba(0,0,0,0.22)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>View Mode</div>
            <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4 }}>
              Switch between approvals, assignments, or both.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="zombie-btn" type="button" onClick={() => setTab("both")} style={{ fontWeight: tab === "both" ? 900 : 700 }}>
              Both
            </button>
            <button className="zombie-btn" type="button" onClick={() => setTab("approve")} style={{ fontWeight: tab === "approve" ? 900 : 700 }}>
              Approvals
            </button>
            <button className="zombie-btn" type="button" onClick={() => setTab("assign")} style={{ fontWeight: tab === "assign" ? 900 : 700 }}>
              Assign
            </button>
          </div>
        </div>
      </div>

      <div
        className="zombie-card"
        style={{
          padding: 14,
          background: "rgba(0,0,0,0.24)",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 16 }}>Dossier Jump</div>
        <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4 }}>
          Open a player dossier by user_id or player_id.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) auto",
            gap: 10,
            marginTop: 12,
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
            <button className="zombie-btn" type="button" onClick={() => openDossierByUserId(dossierUserId)}>
              Resolve + Open
            </button>
            <button className="zombie-btn" type="button" onClick={() => openDossierByPlayerId(dossierPlayerId)}>
              Open
            </button>
          </div>
        </div>
      </div>

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
          <div className="zombie-card" style={{ padding: 12, minWidth: 0 }}>
            <div style={{ fontWeight: 950, fontSize: 18, marginBottom: 4 }}>✅ Approvals</div>
            <div style={{ opacity: 0.72, fontSize: 12, marginBottom: 10 }}>
              Review and approve incoming requests.
            </div>
            <ApprovalsPane />
          </div>
        ) : null}

        {tab !== "approve" ? (
          <div className="zombie-card" style={{ padding: 12, minWidth: 0 }}>
            <div style={{ fontWeight: 950, fontSize: 18, marginBottom: 4 }}>🪪 Assign</div>
            <div style={{ opacity: 0.72, fontSize: 12, marginBottom: 10 }}>
              Assign alliance access and role after approval.
            </div>
            <AssignPane />
          </div>
        ) : null}
      </div>

      <div
        className="zombie-card"
        style={{
          padding: 14,
          background: "rgba(0,0,0,0.20)",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 15 }}>Workflow</div>
        <div style={{ opacity: 0.78, marginTop: 8, lineHeight: 1.6 }}>
          1) Approve request. 2) Assign alliance and role. 3) Open dossier only when extra context is needed.
        </div>
      </div>
    </div>
  );
}
