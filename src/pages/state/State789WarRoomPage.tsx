import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import ActionDrawer from "../../components/commandcenter/ActionDrawer";
import LegacyState789DashboardPage from "./State789DashboardPage";

function Pill(props: { text: string }) {
  return (
    <div
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: "0.04em",
        opacity: 0.92,
      }}
    >
      {props.text}
    </div>
  );
}

function HeroAction(props: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      className="zombie-btn"
      style={{
        padding: "12px 14px",
        fontWeight: 900,
        minWidth: 180,
        boxShadow: props.primary ? "0 10px 30px rgba(0,0,0,0.35)" : "none",
      }}
      onClick={props.onClick}
    >
      {props.label}
    </button>
  );
}

function FeatureCard(props: {
  icon: string;
  title: string;
  text: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div
      className="zombie-card"
      style={{
        padding: 18,
        minHeight: 220,
        display: "grid",
        gap: 10,
        alignContent: "start",
        background: "linear-gradient(180deg, rgba(18,22,28,0.96), rgba(10,12,16,0.94))",
      }}
    >
      <div style={{ fontSize: 28 }}>{props.icon}</div>
      <div style={{ fontSize: 20, fontWeight: 950 }}>{props.title}</div>
      <div style={{ opacity: 0.84, lineHeight: 1.6 }}>{props.text}</div>
      <div>
        <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: 900 }} onClick={props.onClick}>
          {props.cta}
        </button>
      </div>
    </div>
  );
}

function CategoryTile(props: {
  title: string;
  text: string;
}) {
  return (
    <div
      className="zombie-card"
      style={{
        padding: 14,
        minHeight: 120,
        display: "grid",
        gap: 8,
        background: "rgba(0,0,0,0.30)",
      }}
    >
      <div style={{ fontWeight: 950, fontSize: 16 }}>{props.title}</div>
      <div style={{ opacity: 0.8, lineHeight: 1.55 }}>{props.text}</div>
    </div>
  );
}

function StepRow(props: { step: string; title: string; text: string }) {
  return (
    <div
      className="zombie-card"
      style={{
        padding: 16,
        display: "grid",
        gridTemplateColumns: "110px 1fr",
        gap: 14,
        alignItems: "start",
      }}
    >
      <div
        style={{
          borderRadius: 12,
          padding: "10px 12px",
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.04)",
          fontWeight: 950,
          textAlign: "center",
        }}
      >
        {props.step}
      </div>
      <div>
        <div style={{ fontWeight: 950, fontSize: 18 }}>{props.title}</div>
        <div style={{ opacity: 0.82, marginTop: 6, lineHeight: 1.6 }}>{props.text}</div>
      </div>
    </div>
  );
}

function MiniStat(props: { label: string; value: string; sub: string }) {
  return (
    <div
      className="zombie-card"
      style={{
        padding: 14,
        minHeight: 112,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ opacity: 0.72, fontSize: 11, fontWeight: 900, letterSpacing: "0.12em" }}>{props.label}</div>
      <div style={{ fontSize: 24, fontWeight: 950 }}>{props.value}</div>
      <div style={{ opacity: 0.72, fontSize: 12 }}>{props.sub}</div>
    </div>
  );
}

export default function State789WarRoomPage() {
  const nav = useNavigate();
  const [legacyOpen, setLegacyOpen] = useState(false);

  return (
    <>
      <div style={{ display: "grid", gap: 14 }}>
        <div
          className="zombie-card"
          style={{
            padding: 22,
            background: "linear-gradient(180deg, rgba(16,20,26,0.98), rgba(8,10,14,0.94))",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Pill text="STATE 789" />
            <Pill text="COMMAND HUB" />
            <Pill text="LIVE OPS" />
            <Pill text="LEGACY PRESERVED" />
          </div>

          <div style={{ fontSize: 34, fontWeight: 950, marginTop: 14, lineHeight: 1.05 }}>
            State 789 Command Hub
          </div>

          <div style={{ opacity: 0.86, marginTop: 12, lineHeight: 1.7, maxWidth: 980, fontSize: 15 }}>
            A cleaner front door for State 789. Use this hub to jump straight into alerts, discussion, achievements,
            threads, and ops while keeping the existing legacy dashboard available when you need it.
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
            <HeroAction primary label="🚨 Alerts" onClick={() => nav("/state/789/alerts")} />
            <HeroAction label="💬 Discussion" onClick={() => nav("/state/789/discussion")} />
            <HeroAction label="🏆 Achievements" onClick={() => nav("/state/789/achievements")} />
            <HeroAction label="🛰️ Ops Console" onClick={() => nav("/state/789/ops-db")} />
            <HeroAction label="🧟 Legacy Panels" onClick={() => setLegacyOpen(true)} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <MiniStat label="STATE" value="789" sub="Primary command sector" />
          <MiniStat label="MODE" value="LIVE" sub="Fast access launch layout" />
          <MiniStat label="TOOLS" value="READY" sub="Alerts, discussion, ops, threads" />
          <MiniStat label="LEGACY" value="SAFE" sub="Existing dashboard preserved" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          <FeatureCard
            icon="🚨"
            title="Alerts Center"
            text="Open the live alerts workflow for state-wide messaging, fast coordination, and high-visibility notices."
            cta="Open Alerts"
            onClick={() => nav("/state/789/alerts")}
          />
          <FeatureCard
            icon="💬"
            title="Discussion Board"
            text="Jump directly into state discussions and planning without navigating through the older dashboard layout."
            cta="Open Discussion"
            onClick={() => nav("/state/789/discussion")}
          />
          <FeatureCard
            icon="🏆"
            title="Achievements Hub"
            text="Use the redesigned achievements area for player requests, progress, tracking, approvals, and exports."
            cta="Open Achievements"
            onClick={() => nav("/state/789/achievements")}
          />
          <FeatureCard
            icon="🧵"
            title="Threads"
            text="Access state threads and collaboration tools from a cleaner, more direct landing experience."
            cta="Open Threads"
            onClick={() => nav("/state/789/threads")}
          />
        </div>

        <div
          className="zombie-card"
          style={{
            padding: 18,
            background: "linear-gradient(180deg, rgba(14,16,20,0.96), rgba(8,10,14,0.92))",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 950 }}>Core state tools</div>
          <div style={{ opacity: 0.8, marginTop: 8, lineHeight: 1.6 }}>
            The layout is cleaner, but the underlying tools and routes stay exactly where they already work.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 14 }}>
            <CategoryTile title="Alerts" text="Emergency messaging, active warnings, and state coordination." />
            <CategoryTile title="Discussion" text="State planning, collaboration, and communication." />
            <CategoryTile title="Achievements" text="Requests, player progress, approvals, and exports." />
            <CategoryTile title="Ops Console" text="Operational state tools and active command workflows." />
            <CategoryTile title="Threads" text="Ongoing conversation and collaboration tools." />
            <CategoryTile title="Legacy Dashboard" text="Older working panels stay available in a drawer, not removed." />
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <StepRow
            step="STEP 1"
            title="Choose the tool you need"
            text="Use the launch cards to go directly into alerts, discussion, achievements, threads, or ops."
          />
          <StepRow
            step="STEP 2"
            title="Keep the current workflow intact"
            text="This redesign only improves the landing experience. All of the working routes underneath remain the same."
          />
          <StepRow
            step="STEP 3"
            title="Open the legacy dashboard only when needed"
            text="The previous State 789 dashboard is still preserved behind a drawer, so no working functionality is lost."
          />
        </div>

        <div
          className="zombie-card"
          style={{
            padding: 16,
            background: "rgba(0,0,0,0.28)",
          }}
        >
          <div style={{ fontWeight: 950, fontSize: 18 }}>Quick links</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/state/789/alerts")}>
              Alerts
            </button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/state/789/discussion")}>
              Discussion
            </button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/state/789/achievements")}>
              Achievements
            </button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/state/789/ops-db")}>
              Ops Console
            </button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => setLegacyOpen(true)}>
              Open Legacy Panels
            </button>
          </div>
        </div>
      </div>

      <ActionDrawer open={legacyOpen} title="Legacy State 789 Dashboard" onClose={() => setLegacyOpen(false)}>
        <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 10 }}>
          Legacy dashboard preserved here so the redesign does not remove existing functionality.
        </div>
        <LegacyState789DashboardPage />
      </ActionDrawer>
    </>
  );
}
