import React, { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function Card(props: { title: string; desc: string; to: string; tag?: string }) {
  const nav = useNavigate();
  return (
    <button
      type="button"
      onClick={() => nav(props.to)}
      className="zombie-card"
      style={{
        width: "100%",
        textAlign: "left",
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.16)",
        background: "rgba(0,0,0,0.45)",
        color: "rgba(255,255,255,0.92)",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div style={{ fontWeight: 950, fontSize: 18 }}>{props.title}</div>
        {props.tag ? (
          <span style={{ fontSize: 12, opacity: 0.85, border: "1px solid rgba(255,255,255,0.18)", padding: "4px 8px", borderRadius: 999 }}>
            {props.tag}
          </span>
        ) : null}
      </div>
      <div style={{ opacity: 0.86, marginTop: 6, lineHeight: 1.25 }}>{props.desc}</div>
      <div style={{ opacity: 0.6, marginTop: 10, fontSize: 12 }}>{props.to}</div>
    </button>
  );
}

export default function OwnerAlliancePermissionsHubPage() {
  const loc = useLocation();
  const qs = useMemo(() => new URLSearchParams(loc.search), [loc.search]);
  const section = (qs.get("section") || "permissions").toLowerCase();

  return (
    <div style={{ padding: 16, maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 1000, color: "rgba(255,255,255,0.95)" }}>
            🧟 Owner Command Center — Alliances + Permissions
          </h1>
          <div style={{ opacity: 0.85, marginTop: 6 }}>
            One place for alliance directory + sync + permission assignment. (Nothing removed—only organized.)
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="/owner" style={{ textDecoration: "none" }}>
            <button type="button" style={{ padding: "10px 12px", borderRadius: 12 }}>← Back to Owner</button>
          </a>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a href="/owner/permissions?section=permissions" style={{ textDecoration: "none" }}>
          <button type="button" style={{ padding: "10px 12px", borderRadius: 12, opacity: section === "permissions" ? 1 : 0.8 }}>
            Permissions
          </button>
        </a>
        <a href="/owner/permissions?section=alliances" style={{ textDecoration: "none" }}>
          <button type="button" style={{ padding: "10px 12px", borderRadius: 12, opacity: section === "alliances" ? 1 : 0.8 }}>
            Alliances
          </button>
        </a>
        <a href="/owner/permissions?section=ops" style={{ textDecoration: "none" }}>
          <button type="button" style={{ padding: "10px 12px", borderRadius: 12, opacity: section === "ops" ? 1 : 0.8 }}>
            Ops / Debug
          </button>
        </a>
      </div>

      {section === "alliances" ? (
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 12 }}>
          <Card
            title="Alliance Directory (UI)"
            desc="Edit alliances list (codes/names)."
            to="/owner/alliance-directory"
            tag="UI"
          />
          <Card
            title="Directory DB"
            desc="DB-backed alliance directory tooling."
            to="/owner/directory-db"
            tag="DB"
          />
          <Card
            title="Directory Sync"
            desc="Sync directory → DB so everything stays consistent."
            to="/owner/directory-sync"
            tag="SYNC"
          />
          <Card
            title="Alliances Admin"
            desc="Alliance records admin tooling."
            to="/owner/alliances"
          />
          <Card
            title="Memberships"
            desc="See who belongs to which alliance(s)."
            to="/owner/memberships"
          />
        </div>
      ) : section === "ops" ? (
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 12 }}>
          <Card title="Live Ops" desc="Realtime status + runtime context." to="/owner/live-ops" tag="DEBUG" />
          <Card title="Realtime History" desc="Track realtime activity." to="/owner/realtime-history" />
          <Card title="Discord Queue" desc="Queue visibility + send logs." to="/owner/discord-queue" />
          <Card title="System Status" desc="App health page." to="/status" />
        </div>
      ) : (
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 12 }}>
          <Card
            title="Permissions Matrix V3"
            desc="Main per-player permissions assignment UI."
            to="/owner/permissions-matrix-v3"
            tag="PRIMARY"
          />
          <Card
            title="Access Control"
            desc="Permissions UI you like (scoped per alliance/state)."
            to="/owner/access-control"
            tag="SCOPED"
          />
          <Card
            title="Permissions DB"
            desc="DB-focused permissions tooling."
            to="/owner/permissions-db"
            tag="DB"
          />
          <Card
            title="Roles"
            desc="Role definitions tooling."
            to="/owner/roles"
            tag="ROLES"
          />
        </div>
      )}
    </div>
  );
}
