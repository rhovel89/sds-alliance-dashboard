import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { OWNER_ROUTE_INDEX, STATE_ROUTE_INDEX, ROUTE_INDEX } from "../../config/routeIndex.generated";

function isLegacy(path: string) {
  const p = String(path || "");
  return (
    p.includes("-v2") ||
    p.includes("-v3") ||
    p.includes("-db") ||
    p.includes("/debug") ||
    p.includes("/edge-test") ||
    p.includes("/test") ||
    p.includes("/realtime-history")
  );
}

function RouteCard(props: { path: string; meta?: string }) {
  return (
    <Link
      to={props.path}
      style={{
        textDecoration: "none",
        color: "inherit",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 12,
        padding: 12,
        display: "block",
      }}
    >
      <div style={{ fontWeight: 900 }}>{props.path}</div>
      {props.meta ? <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>{props.meta}</div> : null}
    </Link>
  );
}

export default function OwnerLinksIndexPage() {
  const [q, setQ] = useState("");
  const [showLegacy, setShowLegacy] = useState(false);

  const query = q.trim().toLowerCase();

  const pinned = useMemo(() => {
    // Curated “must have” links (safe: only shows if route exists)
    const wanted = [
      "/owner",
      "/owner/onboarding-queue",
      "/owner/access-control",
      "/owner/permissions?section=permissions",
      "/owner/memberships",
      "/owner/players",
      "/owner/mail-broadcast",
      "/owner/discord-queue",
      "/owner/data-vault",
      "/owner/directory-db",
      "/owner/alliance-directory",
      "/owner/alliances",
      "/state/789",
      "/state/789/alerts-db",
      "/state/789/discussion-db",
      "/state/789/achievements/request-v2",
      "/state/789/achievements/admin-v2",
      "/me",
      "/mail-v2",
    ];
    const existing = new Set(ROUTE_INDEX.map(r => r.path));
    return wanted.filter(p => existing.has(p));
  }, []);

  const ownerList = useMemo(() => {
    return OWNER_ROUTE_INDEX
      .map(r => r.path)
      .filter(p => (showLegacy ? true : !isLegacy(p)))
      .filter(p => (query ? p.toLowerCase().includes(query) : true))
      .sort((a, b) => a.localeCompare(b));
  }, [query, showLegacy]);

  const stateList = useMemo(() => {
    return STATE_ROUTE_INDEX
      .map(r => r.path)
      .filter(p => (showLegacy ? true : !isLegacy(p)))
      .filter(p => (query ? p.toLowerCase().includes(query) : true))
      .sort((a, b) => a.localeCompare(b));
  }, [query, showLegacy]);

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>🧭 All Tools Index</h2>
        <Link to="/owner" style={{ textDecoration: "none" }}>← Back to Owner</Link>
      </div>

      <div style={{ marginTop: 10, opacity: 0.85 }}>
        Search and open any page. This does not remove anything — it just makes everything easy to find.
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search routes… (example: permissions, discord, achievements)"
          style={{ flex: 1, minWidth: 280 }}
        />
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={showLegacy} onChange={(e) => setShowLegacy(e.target.checked)} />
          Show legacy/experimental
        </label>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Pinned</div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {pinned.map(p => <RouteCard key={p} path={p} />)}
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Owner Pages</div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {ownerList.map(p => <RouteCard key={p} path={p} meta={isLegacy(p) ? "Legacy / variant" : ""} />)}
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>State Pages</div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {stateList.map(p => <RouteCard key={p} path={p} meta={isLegacy(p) ? "Legacy / variant" : ""} />)}
        </div>
      </div>
    </div>
  );
}

