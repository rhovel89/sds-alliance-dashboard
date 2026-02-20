import React from "react";

export function GuidesQuickLink() {
  const pathname = (typeof window !== "undefined" && window.location?.pathname) ? window.location.pathname : "";
  const m = pathname.match(/^\/dashboard\/([^\/]+)/);
  if (!m) return null;

  const allianceId = m[1];
  if (!allianceId) return null;

  // Hide button if already on Guides page
  if (pathname.includes("/guides")) return null;

  const href = `/dashboard/${allianceId}/guides`;

  return (
    <a
      href={href}
      className="zombie-btn"
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 9999,
        textDecoration: "none",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
      }}
      title="Open Alliance Guides"
    >
      📚 Guides
    </a>
  );
}