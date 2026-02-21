import React, { useMemo } from "react";
import { NavLink } from "react-router-dom";

type Props = {
  allianceCode: string;
};

function btnStyle(isActive: boolean): React.CSSProperties {
  return {
    width: "100%",
    textAlign: "left",
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(120,255,120,0.18)",
    background: isActive ? "rgba(120,255,120,0.10)" : "rgba(0,0,0,0.18)",
    boxShadow: "0 0 0 1px rgba(0,0,0,0.25) inset",
    cursor: "pointer",
    fontWeight: 900,
  };
}

export default function AllianceSidebarTabs({ allianceCode }: Props) {
  const code = useMemo(() => String(allianceCode || "").toUpperCase(), [allianceCode]);

  const base = `/dashboard/${code}`;

  const items = [
    { to: `${base}`, label: "My Alliance", icon: "🧟" },
    { to: `${base}/announcements`, label: "Announcements", icon: "📣" },
    { to: `${base}/hq-map`, label: "HQ Layout", icon: "🗺️" },
    { to: `${base}/calendar`, label: "Calendar", icon: "📅" },
    { to: `${base}/guides`, label: "Guides", icon: "📚" },
    { to: `${base}/permissions`, label: "Permissions", icon: "🔒" },
    { to: `${base}/events`, label: "Events", icon: "🎯" },
  ];

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ fontWeight: 900, opacity: 0.9, paddingLeft: 4 }}>
        Alliance • <span style={{ color: "#b6ffb6" }}>{code}</span>
      </div>

      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          style={({ isActive }) => ({
            ...btnStyle(isActive),
            color: "inherit",
            textDecoration: "none",
            display: "flex",
            gap: 10,
            alignItems: "center",
          })}
          end={it.to === base}
        >
          <span style={{ width: 20, display: "inline-flex", justifyContent: "center" }}>{it.icon}</span>
          <span>{it.label}</span>
        </NavLink>
      ))}
    </div>
  );
}