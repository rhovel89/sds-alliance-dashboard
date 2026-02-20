import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AllianceThemePicker } from "../theme/AllianceThemePicker";

export function AllianceQuickLinksPanel() {
  const nav = useNavigate();
  const params = useParams();
  const allianceCode = useMemo(() => (params.alliance_id || "").toString().toUpperCase(), [params.alliance_id]);

  const base = useMemo(() => "/dashboard/" + allianceCode, [allianceCode]);

  const links = useMemo(
    () => [
      { label: "🧭 Alliance Home", to: base },
      { label: "📚 Guides", to: base + "/guides" },
      { label: "🗓 Calendar", to: base + "/calendar" },
      { label: "🏗 HQ Map", to: base + "/hq-map" },
      { label: "🧪 System Status", to: "/status" },
      { label: "🧟 Me", to: "/me" },
      { label: "🧭 Alliance Directory", to: "/alliances" },
      { label: "🛰 State 789 Dashboard", to: "/state/789" },
    ],
    [base]
  );

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        className="zombie-card"
        style={{
          padding: 14,
          borderRadius: 16,
          background: "var(--sad-card, rgba(0,0,0,0.35))",
          border: "1px solid var(--sad-border, rgba(120,255,120,0.18))",
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>🧟 Quick Links</div>
          <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.75 }}>
            Current Alliance: <b>{allianceCode || "—"}</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
          {links.map((l) => (
            <button
              key={l.to}
              className="zombie-btn"
              style={{ height: 34, padding: "0 12px" }}
              onClick={() => nav(l.to)}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 12 }}>
          <AllianceThemePicker allianceCode={allianceCode} compact />
        </div>
      </div>
    </div>
  );
}