import React from "react";
import { useNavigate } from "react-router-dom";
import SupportBundleButton from "../../components/system/SupportBundleButton";

function Tile(props: { title: string; sub: string; to: string; emoji: string }) {
  const nav = useNavigate();
  return (
    <button
      type="button"
      className="zombie-card"
      style={{
        padding: 16,
        borderRadius: 18,
        textAlign: "left",
        color: "rgba(255,255,255,0.98)",
        border: "1px solid rgba(255,255,255,0.14)",
        background: "linear-gradient(180deg, rgba(20,20,24,0.78), rgba(10,10,12,0.78))",
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      }}
      onClick={() => nav(props.to)}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ fontSize: 24, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.6))" }}>{props.emoji}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 980, fontSize: 16, letterSpacing: 0.2, textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>
            {props.title}
          </div>
          <div style={{ opacity: 0.9, fontSize: 13, marginTop: 4, lineHeight: 1.25 }}>
            {props.sub}
          </div>
        </div>
        <div style={{ marginLeft: "auto", opacity: 0.85, fontSize: 12, whiteSpace: "nowrap" }}>{props.to}</div>
      </div>
    </button>
  );
}

export default function OwnerCommandCenterV2Page() {
  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 1000, letterSpacing: 0.3 }}>🧟 Owner Command Center</h2>
          <div style={{ marginTop: 6, opacity: 0.9, fontSize: 13 }}>
            High-visibility controls for approvals, permissions, audits, and ops.
          </div>
        </div>
        <SupportBundleButton />
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        <Tile emoji="✅" title="Onboarding Queue" sub="Approve → provision → welcome mail" to="/owner/onboarding-queue" />
        <Tile emoji="🧩" title="Access Control" sub="Per-alliance + state permissions" to="/owner/access-control" />
        <Tile emoji="📡" title="Activity Feed" sub="Ops + audit trail (who did what)" to="/owner/activity-feed" />
        <Tile emoji="📣" title="Broadcast Mail" sub="Send announcements to alliance members" to="/owner/mail-broadcast-v2" />
        <Tile emoji="🗂️" title="Directory Sync" sub="Alliance map + directory management" to="/owner/directory-sync" />
        <Tile emoji="🧾" title="Data Vault" sub="Export/import all configs + backups" to="/owner/data-vault" />
        <Tile emoji="🔎" title="Command Search" sub="Search mail, bulletins, and guides" to="/search" />
      </div>
    </div>
  );
}
