import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function getAllianceHome(pathname: string): string | null {
  // allow optional trailing slash
  const p = (pathname || "").replace(/\/+$/, "");
  const m = p.match(/^\/dashboard\/([^\/]+)$/);
  if (!m) return null;
  const code = (m[1] || "").toString().trim();
  return code ? code.toUpperCase() : null;
}

export function DashboardHomeQuickLinks() {
  const loc = useLocation();
  const nav = useNavigate();

  const alliance = useMemo(() => getAllianceHome(loc.pathname), [loc.pathname]);
  if (!alliance) return null;

  const go = (path: string) => nav(path);

  return (
    <div
      className="zombie-card"
      style={{
        position: "fixed",
        right: 14,
        top: 92,
        zIndex: 25000,
        width: 320,
        padding: 12,
        borderRadius: 14,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
      }}
      title="Quick Links (home only)"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ fontWeight: 700 }}>⚡ Quick Links</div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>{alliance}</div>
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
        <button className="zombie-btn" onClick={() => go(`/dashboard/${alliance}/calendar`)}>📅 Calendar</button>
        <button className="zombie-btn" onClick={() => go(`/dashboard/${alliance}/guides`)}>📚 Guides</button>
        <button className="zombie-btn" onClick={() => go(`/dashboard/${alliance}/hq-map`)}>🗺️ HQ Map</button>
        <button className="zombie-btn" onClick={() => go(`/dashboard/${alliance}`)}>🏠 Dashboard Home</button>
      </div>

      <div style={{ height: 1, background: "rgba(120,255,120,0.14)", margin: "10px 0" }} />

      <div style={{ display: "grid", gap: 8 }}>
        <button className="zombie-btn" onClick={() => go("/status")}>🧪 System Status</button>
        <button className="zombie-btn" onClick={() => go("/me")}>🧟 Dashboard Select</button>
      </div>

      <div style={{ marginTop: 10, fontSize: 11, opacity: 0.65 }}>
        Visible only on /dashboard/&lt;ALLIANCE&gt; (home).
      </div>
    </div>
  );
}