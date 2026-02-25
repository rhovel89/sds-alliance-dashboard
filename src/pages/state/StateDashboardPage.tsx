import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import SupportBundleButton from "../../components/system/SupportBundleButton";
import StateAchievementsProgressPanel from "../../components/state/StateAchievementsProgressPanel";
import StateBulletinBoardPanel from "../../components/state/StateBulletinBoardPanel";

function CardButton(props: { emoji: string; label: string; to: string; sub?: string }) {
  const nav = useNavigate();
  return (
    <button
      className="zombie-card"
      style={{
        width: "100%",
        textAlign: "left",
        padding: 14,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
      onClick={() => nav(props.to)}
      type="button"
    >
      <div style={{ fontSize: 22 }}>{props.emoji}</div>
      <div>
        <div style={{ fontWeight: 900 }}>{props.label}</div>
        {props.sub ? (
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 2 }}>{props.sub}</div>
        ) : null}
      </div>
      <div style={{ marginLeft: "auto", opacity: 0.65, fontSize: 12 }}>{props.to}</div>
    </button>
  );
}

export default function StateDashboardPage() {
  const title = useMemo(() => "🧟 State Hub", []);

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <SupportBundleButton />
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <CardButton emoji="🚨" label="State Alerts" to="/state/789/alerts" sub="Compose + pin + export/import" />
        <CardButton emoji="💬" label="State Discussions" to="/state/789/discussion" sub="Threads + tags + export/import" />
        <CardButton emoji="🏆" label="State Achievements" to="/state/789/achievements" sub="Requests + progress tracking" />
      </div>

      <div style={{ marginTop: 12 }}>
        <StateBulletinBoardPanel stateCode="789" />
      </div>


      <div style={{ marginTop: 12 }}>
        <StateAchievementsProgressPanel stateCode="789" />
      </div>
    </div>
  );
}



