import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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
          <span
            style={{
              fontSize: 12,
              opacity: 0.9,
              border: "1px solid rgba(255,255,255,0.18)",
              padding: "4px 8px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
            }}
          >
            {props.tag}
          </span>
        ) : null}
      </div>
      <div style={{ opacity: 0.86, marginTop: 6, lineHeight: 1.25 }}>{props.desc}</div>
      <div style={{ opacity: 0.6, marginTop: 10, fontSize: 12 }}>{props.to}</div>
    </button>
  );
}

function TabButton(props: { label: string; section: string; current: string }) {
  const active = props.current === props.section;
  return (
    <a href={`/owner/permissions?section=${encodeURIComponent(props.section)}`} style={{ textDecoration: "none" }}>
      <button
        type="button"
        style={{
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.16)",
          background: active ? "rgba(120,255,120,0.10)" : "rgba(0,0,0,0.35)",
          color: "rgba(255,255,255,0.92)",
          opacity: active ? 1 : 0.85,
          cursor: "pointer",
        }}
      >
        {props.label}
      </button>
    </a>
  );
}

export default function OwnerAlliancePermissionsHubPage() {
  const loc = useLocation();
  const section = useMemo(() => {
    const qs = new URLSearchParams(loc.search);
    return (qs.get("section") || "players").toLowerCase();
  }, [loc.search]);

  return (
    <div style={{ padding: 16, maxWidth: 1450, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 1000, color: "rgba(255,255,255,0.95)" }}>
            🧟 Owner Ops — Players + Alliances + Permissions
          </h1>
          <div style={{ opacity: 0.85, marginTop: 6 }}>
            One clean hub. No features removed — only organized into a simple flow.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="/owner" style={{ textDecoration: "none" }}>
            <button type="button" style={{ padding: "10px 12px", borderRadius: 12 }}>
              ← Back to Owner
            </button>
          </a>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <TabButton label="Players" section="players" current={section} />
        <TabButton label="Alliances" section="alliances" current={section} />
        <TabButton label="Permissions" section="permissions" current={section} />
        <TabButton label="Ops / Debug" section="ops" current={section} />
      </div>

      {section === "alliances" ? (
        <>
          <div style={{ marginTop: 14, opacity: 0.9 }}>
            Suggested flow: <b>Directory → Sync → Alliances/Memberships → Permissions</b>
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 12 }}>
            <Card title="Alliance Directory (UI)" desc="Edit alliance codes/names (fast)." to="/owner/alliance-directory" tag="UI" />
            <Card title="Directory DB" desc="DB-backed directory tooling." to="/owner/directory-db" tag="DB" />
            <Card title="Directory Sync" desc="Sync directory → DB so everything stays consistent." to="/owner/directory-sync" tag="SYNC" />
            <Card title="Alliances Admin" desc="Alliance records admin tooling." to="/owner/alliances" />
            <Card title="Memberships" desc="See who belongs to which alliance(s)." to="/owner/memberships" />
            <Card title="Roles" desc="Alliance/state role definitions (if needed)." to="/owner/roles" tag="ROLES" />
          </div>
        </>
      ) : section === "permissions" ? (
        <>
          <div style={{ marginTop: 14, opacity: 0.9 }}>
            Suggested flow: <b>Find player → Set membership(s) → Assign permissions → Verify</b>
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 12 }}>
            <Card title="Permissions Matrix V3" desc="Main per-player permissions assignment UI." to="/owner/permissions-matrix-v3" tag="PRIMARY" />
            <Card title="Access Control" desc="Scoped per alliance/state permissions UI." to="/owner/access-control" tag="SCOPED" />
            <Card title="Permissions DB" desc="DB-focused permissions tooling." to="/owner/permissions-db" tag="DB" />
            <Card title="Roles" desc="Role definitions tooling." to="/owner/roles" tag="ROLES" />
            <Card title="Memberships" desc="Set who is in what alliance(s) and their role." to="/owner/memberships" />
          </div>
        </>
      ) : section === "ops" ? (
        <>
          <div style={{ marginTop: 14, opacity: 0.9 }}>
            Diagnostics + queues + realtime support.
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 12 }}>
            <Card title="Live Ops" desc="Runtime context + environment." to="/owner/live-ops" tag="DEBUG" />
            <Card title="Realtime History" desc="Track realtime activity." to="/owner/realtime-history" />
            <Card title="Discord Queue" desc="Queue visibility + send logs." to="/owner/discord-queue" />
            <Card title="System Status" desc="App health page." to="/status" />
          </div>
        </>
      ) : (
        <>
          <div style={{ marginTop: 14, opacity: 0.9 }}>
            Suggested flow: <b>Player intake → Approve/provision → Memberships → Permissions</b>
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 12 }}>
            <Card title="Player Intake" desc="Review new players and process them." to="/owner/player-intake" tag="START" />
            <Card title="Onboarding Queue" desc="Approve/provision new access." to="/owner/onboarding-queue" />
            <Card title="Players" desc="Player directory and linking tools." to="/owner/players" />
            <Card title="Memberships" desc="Assign alliance memberships + roles." to="/owner/memberships" />
            <Card title="Permissions (Matrix V3)" desc="Grant what they can do (per alliance/state)." to="/owner/permissions-matrix-v3" tag="PRIMARY" />
          </div>
        </>
      )}
    </div>
  );
}
