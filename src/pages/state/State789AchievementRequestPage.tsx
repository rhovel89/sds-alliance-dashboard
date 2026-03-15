import React from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";
import { StateAchievementsRequestForm } from "../../components/state/StateAchievementsRequestForm";

export default function State789AchievementRequestPage() {
  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto", display: "grid", gap: 12 }}>
      <div
        className="zombie-card"
        style={{
          padding: 18,
          background: "linear-gradient(180deg, rgba(16,20,26,0.98), rgba(8,10,14,0.94))",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950 }}>🏆 State 789 Achievement Request</h1>
            <div style={{ opacity: 0.82, marginTop: 8, lineHeight: 1.6 }}>
              Submit your achievement request here. The approval path stays the same.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" type="button" style={{ padding: "10px 12px" }} onClick={() => window.location.assign("/state/789/achievements")}>
              Achievements
            </button>
            <button className="zombie-btn" type="button" style={{ padding: "10px 12px" }} onClick={() => window.location.assign("/state/789/achievements-tracker")}>
              Tracker
            </button>
            <button className="zombie-btn" type="button" style={{ padding: "10px 12px" }} onClick={() => window.location.assign("/state/789/achievements-progress")}>
              Progress
            </button>
            <SupportBundleButton />
          </div>
        </div>
      </div>

      <div className="zombie-card" style={{ padding: 14 }}>
        <div style={{ opacity: 0.8 }}>
          Use this page to request an achievement without changing the approval or tracking flow.
        </div>
      </div>

      <StateAchievementsRequestForm stateCode="789" />
    </div>
  );
}
