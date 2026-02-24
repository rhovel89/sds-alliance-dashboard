import React from "react";

export default function MeQuickPanels() {
  return (
    <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
      <div style={{ border: "1px solid #333", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 900 }}>Quick Links</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
          <a href="/mail-threads">Mail Threads</a>
          <a href="/mail-v2">Mail Inbox</a>
          <a href="/me/hq-manager">HQ Manager</a>
          <a href="/state/789/achievements/progress-v2">My Achievements</a>
          <a href="/state/789/alerts-db">State Alerts</a>
          <a href="/state/789/discussion-db">State Discussion</a>
        </div>
        <div style={{ opacity: 0.7, fontSize: 12, marginTop: 8 }}>
          These are safe navigation links (no DB coupling).
        </div>
      </div>
    </div>
  );
}
