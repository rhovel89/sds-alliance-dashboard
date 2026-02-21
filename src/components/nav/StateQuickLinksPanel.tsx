import React from "react";
import { Link } from "react-router-dom";

function pillStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.20)",
    textDecoration: "none",
    color: "inherit",
    fontWeight: 900,
    minWidth: 170,
    justifyContent: "center",
  };
}

export default function StateQuickLinksPanel() {
  return (
    <div className="zombie-card" style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>⚡ State 789 — Quick Links</div>
        <div style={{ opacity: 0.7, fontSize: 12 }}>State tools (UI-only shells where applicable)</div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link to="/state/789" style={pillStyle()}>🗺️ State Dashboard</Link>
        <Link to="/state/789/alerts" style={pillStyle()}>🚨 State Alerts</Link>
        <Link to="/state/789/discussion" style={pillStyle()}>💬 Discussion</Link>
        <Link to="/state/789/achievements" style={pillStyle()}>🏆 Achievements</Link>
      </div>
    </div>
  );
}