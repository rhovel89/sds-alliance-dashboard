import React from "react";
import { useNavigate } from "react-router-dom";
import PlayerDashboardPage from "./PlayerDashboardPage";
import SupportBundleButton from "../components/system/SupportBundleButton";

export default function PlayerDashboardSafePage() {
  const nav = useNavigate();

  return (
    <div style={{ padding: 14 }}>
      <div className="zombie-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>🧟 Player Hub</div>
          <SupportBundleButton />
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/dashboard")}>
            Open Dashboard Selector
          </button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/owner")}>
            Owner
          </button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/debug")}>
            Debug
          </button>
        </div>

        <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>
          If the legacy PlayerDashboardPage renders nothing, this shell prevents a black screen.
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <PlayerDashboardPage />
      </div>
    </div>
  );
}