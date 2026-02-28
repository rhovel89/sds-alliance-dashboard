import React from "react";
import { Link } from "react-router-dom";

export default function AllianceRosterLaunchCard() {
  return (
    <Link
      to="roster"
      className="zombie-card"
      style={{
        display: "block",
        padding: 14,
        borderRadius: 16,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 16 }}>🧟 Alliance Roster</div>
          <div style={{ marginTop: 4, opacity: 0.8, fontSize: 12 }}>
            View members + HQ counts/levels • Owner/Admin can manage roles
          </div>
        </div>
        <div style={{ opacity: 0.7, fontSize: 12 }}>Open →</div>
      </div>
    </Link>
  );
}
