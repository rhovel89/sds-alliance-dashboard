import React from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";
import { StateAchievementsRequestForm } from "../../components/state/StateAchievementsRequestForm";

export default function State789AchievementsFormPage() {
  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🏆 State 789 — Achievement Requests</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => window.location.assign("/state/789")}>Back to State</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => window.location.assign("/state/789/achievements-progress")}>Progress</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => window.location.assign("/state/789/achievements-tracker")}>Tracker</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ opacity: 0.8 }}>
          Submit what you want/need (example: SWP Weapon → Rail Gun) or your current progress (Governor Rotations 0/3 → 3/3).
        </div>
      </div>

      <StateAchievementsRequestForm stateCode="789" />
    </div>
  );
}