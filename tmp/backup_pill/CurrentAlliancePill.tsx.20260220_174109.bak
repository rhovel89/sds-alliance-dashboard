import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function getAllianceFromPath(pathname: string): string | null {
  const m = (pathname || "").match(/^\/dashboard\/([^\/]+)/);
  if (!m) return null;
  const code = (m[1] || "").toString().trim();
  return code ? code.toUpperCase() : null;
}

export function CurrentAlliancePill() {
  const loc = useLocation();
  const nav = useNavigate();

  const alliance = useMemo(() => getAllianceFromPath(loc.pathname), [loc.pathname]);
  if (!alliance) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(0,0,0,0.20)",
          fontSize: 12,
          opacity: 0.75,
          whiteSpace: "nowrap",
        }}
        title="No alliance in URL"
      >
        🧩 <span>Alliance</span> <span style={{ opacity: 0.8 }}>•</span> <span>—</span>
      </div>
    );
  }

  return (
    <button
      className="zombie-btn"
      style={{
        height: 34,
        padding: "0 12px",
        borderRadius: 999,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        whiteSpace: "nowrap",
      }}
      onClick={() => nav("/dashboard/" + alliance)}
      title={"Current alliance: " + alliance + " (click to open dashboard home)"}
    >
      🧩 <span style={{ opacity: 0.85 }}>Alliance</span> <span>•</span> <b>{alliance}</b>
    </button>
  );
}