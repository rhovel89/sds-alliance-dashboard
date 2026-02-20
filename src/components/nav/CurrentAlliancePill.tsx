import React, { useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import { RealtimeStatusBadge } from "../system/RealtimeStatusBadge";

function parseAllianceFromPath(pathname: string): string | null {
  // /dashboard/:alliance_id/...
  const m = pathname.match(/^\/dashboard\/([^\/?#]+)/i);
  if (!m) return null;
  const code = String(m[1] || "").trim();
  return code ? code.toUpperCase() : null;
}

export default function CurrentAlliancePill() {
  const loc = useLocation();
  const params = useParams();

  const alliance = useMemo(() => {
    // prefer params if present
    const p = (params as any)?.alliance_id;
    if (p) return String(p).toUpperCase();
    return parseAllianceFromPath(loc.pathname);
  }, [loc.pathname, params]);

  const label = alliance || "—";

  return (
    <div
      className="zombie-card"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 999,
        marginLeft: 10,
        whiteSpace: "nowrap",
      }}
      title="Current Alliance (from URL)"
    >
      <div style={{ fontWeight: 900, fontSize: 12 }}>🏷️ {label}</div>
      <RealtimeStatusBadge allianceCode={alliance} />
      <button
        className="zombie-btn"
        style={{ padding: "6px 8px", fontSize: 12 }}
        onClick={async () => {
          if (!alliance) return window.alert("No alliance in this URL.");
          try {
            await navigator.clipboard.writeText(alliance);
            window.alert("Copied: " + alliance);
          } catch {
            window.prompt("Copy alliance:", alliance);
          }
        }}
      >
        Copy
      </button>
    </div>
  );
}