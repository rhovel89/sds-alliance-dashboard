import React from "react";

function BigLink(props: { title: string; desc: string; to: string }) {
  return (
    <a href={props.to} style={{ textDecoration: "none" }}>
      <div
        className="zombie-card"
        style={{
          border: "1px solid rgba(255,255,255,0.16)",
          borderRadius: 18,
          padding: 18,
          background: "rgba(0,0,0,0.45)",
          color: "rgba(255,255,255,0.92)",
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 1000 }}>{props.title}</div>
        <div style={{ marginTop: 6, opacity: 0.86 }}>{props.desc}</div>
        <div style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>{props.to}</div>
      </div>
    </a>
  );
}

export default function OwnerHomePage() {
  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 1000 }}>🧟 Owner Command Center</h1>
      <div style={{ marginTop: 6, opacity: 0.85 }}>
        Clean UI: only the two flows. Everything else is hidden under Advanced.
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 12 }}>
        <BigLink title="Player Ops Flow" desc="Intake → Approve → Memberships → Permissions (one page)." to="/owner/player-ops" />
        <BigLink title="Alliance Ops Flow" desc="Directory → Sync → Alliances → Memberships (one page)." to="/owner/alliance-ops" />
      </div>

      <details style={{ marginTop: 16, border: "1px solid rgba(255,255,255,0.14)", borderRadius: 16, padding: 12, background: "rgba(0,0,0,0.35)" }}>
        <summary style={{ cursor: "pointer", fontWeight: 900 }}>Advanced (hide most links)</summary>
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
          <a href="/owner/permissions-matrix-v3" style={{ textDecoration: "none" }}><button type="button">Permissions Matrix V3 (direct)</button></a>
          <a href="/owner/access-control" style={{ textDecoration: "none" }}><button type="button">Access Control (direct)</button></a>
          <a href="/owner/onboarding-queue" style={{ textDecoration: "none" }}><button type="button">Onboarding Queue (direct)</button></a>
          <a href="/owner/memberships" style={{ textDecoration: "none" }}><button type="button">Memberships (direct)</button></a>
          <a href="/owner/alliance-directory" style={{ textDecoration: "none" }}><button type="button">Alliance Directory (direct)</button></a>
          <a href="/owner/directory-sync" style={{ textDecoration: "none" }}><button type="button">Directory Sync (direct)</button></a>
          <a href="/owner/command-center" style={{ textDecoration: "none" }}><button type="button">Legacy Owner Page</button></a>
        </div>
      </details>
    </div>
  );
}
