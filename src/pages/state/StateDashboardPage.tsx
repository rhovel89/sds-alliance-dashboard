import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import SupportBundleButton from "../../components/system/SupportBundleButton";
import { RealtimeStatusBadge } from "../../components/system/RealtimeStatusBadge";
import StateAchievementsMiniProgressCard from "../../components/state/StateAchievementsMiniProgressCard";

function CardButton(props: { emoji: string; label: string; to: string; sub?: string }) {
  const nav = useNavigate();
  return (
    <button
      className="zombie-btn"
      style={{
        width: "100%",
        textAlign: "left",
        padding: "12px 12px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
      onClick={() => nav(props.to)}
    >
      <div style={{ fontSize: 18 }}>{props.emoji}</div>
      <div>
        <div style={{ fontWeight: 900 }}>{props.label}</div>
        {props.sub ? <div style={{ opacity: 0.7, fontSize: 12, marginTop: 2 }}>{props.sub}</div> : null}
      </div>
      <div style={{ marginLeft: "auto", opacity: 0.65, fontSize: 12 }}>{props.to}</div>
    </button>
  );
}

export default function StateDashboardPage() {
  const nav = useNavigate();
  const title = useMemo(() => "🧟 State Hub", []);

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <RealtimeStatusBadge allianceCode={null} />
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 14 }}>State 789</div>
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
          <CardButton emoji="🧟" label="State 789 Dashboard" to="/state/789" sub="Main state command center (UI shell + widgets)" />
          <CardButton emoji="🚨" label="State 789 Alerts" to="/state/789/alerts" sub="Pinned alerts + export/import (UI-only)" />
          <CardButton emoji="💬" label="State 789 Discussion" to="/state/789/discussion" sub="Threads + tags + export/import (UI shell)" />
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/alliances")}>
            🗂️ Alliance Directory
          </button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/dashboard")}>
            ⚡ Dashboard Selector
          </button>
        </div>

        <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
          This is a hub page. No alliance context is required here.
        </div>
      </div>
    </div>
  );
}
