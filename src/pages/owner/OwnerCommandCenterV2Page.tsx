import React from "react";
import { useNavigate } from "react-router-dom";
import SupportBundleButton from "../../components/system/SupportBundleButton";

function Tile(props: { title: string; sub: string; to: string; emoji: string }) {
  const nav = useNavigate();
  return (
    <button type="button" className="zombie-card" style={{ padding: 14, borderRadius: 16, textAlign: "left" }} onClick={() => nav(props.to)}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ fontSize: 22 }}>{props.emoji}</div>
        <div>
          <div style={{ fontWeight: 950 }}>{props.title}</div>
          <div style={{ opacity: 0.8, fontSize: 12, marginTop: 2 }}>{props.sub}</div>
        </div>
        <div style={{ marginLeft: "auto", opacity: 0.6, fontSize: 12 }}>{props.to}</div>
      </div>
    </button>
  );
}

export default function OwnerCommandCenterV2Page() {
  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🧟 Owner Command Center</h2>
        <SupportBundleButton />
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <Tile emoji="✅" title="Onboarding Queue" sub="Approve → provision → welcome mail" to="/owner/onboarding-queue" />
        <Tile emoji="🧩" title="Access Control" sub="Per-alliance + state permissions" to="/owner/access-control" />
        <Tile emoji="📡" title="Activity Feed" sub="Ops + audit trail" to="/owner/activity-feed" />
        <Tile emoji="📣" title="Broadcast Mail" sub="Send to alliance members" to="/owner/mail-broadcast-v2" />
        <Tile emoji="🗂️" title="Directory Sync" sub="Alliance map + directory" to="/owner/directory-sync" />
        <Tile emoji="🧾" title="Data Vault" sub="Export/import configs" to="/owner/data-vault" />
        <Tile emoji="🔎" title="Command Search" sub="Search mail/bulletins/guides" to="/search" />
      </div>
    </div>
  );
}
