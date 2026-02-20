import React from "react";
import { useNavigate } from "react-router-dom";
import SupportBundleButton from "../system/SupportBundleButton";

function Btn(props: { label: string; emoji: string; to: string }) {
  const nav = useNavigate();
  return (
    <button
      className="zombie-btn"
      style={{ width: "100%", textAlign: "left", padding: "12px 12px", display: "flex", gap: 10, alignItems: "center" }}
      onClick={() => nav(props.to)}
    >
      <div style={{ fontSize: 18 }}>{props.emoji}</div>
      <div style={{ fontWeight: 900 }}>{props.label}</div>
      <div style={{ marginLeft: "auto", opacity: 0.65, fontSize: 12 }}>{props.to}</div>
    </button>
  );
}

export default function OwnerToolsQuickNav() {
  return (
    <div className="zombie-card" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 900, fontSize: 14 }}>🧰 Owner Tools — Quick Nav</div>
        <SupportBundleButton />
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
        <Btn emoji="✅" label="One-click Approve + Provision" to="/owner/oneclick-provision" />
        <Btn emoji="🎯" label="Event Types Library (UI-only)" to="/owner/event-types-library" />
        <Btn emoji="📣" label="Broadcast Composer" to="/owner/broadcast" />
        <Btn emoji="🗂️" label="Alliance Directory Editor" to="/owner/alliance-directory" />
        <Btn emoji="🧩" label="Permissions Matrix (UI shell)" to="/owner/permissions-matrix" />
        <Btn emoji="🧭" label="Jump Into Alliance" to="/owner/jump" />
        <Btn emoji="🔧" label="Discord Settings" to="/owner/discord" />
      </div>

      <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
        This is UI-only navigation. Backend permissions are still enforced by RLS.
      </div>
    </div>
  );
}