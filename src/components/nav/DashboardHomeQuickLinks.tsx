import React from "react";

/**
 * Disabled to prevent duplicate Quick Links sections.
       <div style={{ marginTop: 12, fontWeight: 900 }}>🧟 State</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
        <QuickLink icon="🏴" label="State Dashboard" to="/state" />
        <QuickLink icon="🧪" label="State 789" to="/state/789" />
      </div>
 * We keep the main Quick Links panel on:
 *   /dashboard/:alliance_id  (AllianceDashboardIndexPage -> AllianceQuickLinksPanel)
         <QuickLink icon="📬" label="My Mail" to="/mail" />
 */
export function DashboardHomeQuickLinks() {
  return null;
}

export default DashboardHomeQuickLinks;
