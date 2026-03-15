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
            <Pill text="WAR ROOM" />
            <Pill text="LIVE OPS" />
            <Pill text="NO ROUTE CHANGES" />
          </div>

          <div style={{ fontSize: 34, fontWeight: 950, marginTop: 14, lineHeight: 1.05 }}>
            State 789 Command Hub
          </div>

          <div style={{ opacity: 0.86, marginTop: 12, lineHeight: 1.7, maxWidth: 980, fontSize: 15 }}>
            A cleaner launch page for State 789. Use this as the main hub for alerts, discussion, ops, threads, and achievements
            while keeping the existing legacy dashboard available when needed.
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
            <HeroAction primary label="🚨 Alerts" onClick={() => nav("/state/789/alerts")} />
            <HeroAction label="💬 Discussion" onClick={() => nav("/state/789/discussion")} />
            <HeroAction label="🏆 Achievements" onClick={() => nav("/state/789/achievements")} />
            <HeroAction label="🛰️ Ops Console" onClick={() => nav("/state/789/ops-db")} />
            <HeroAction label="🧟 Legacy Dashboard" onClick={() => setLegacyOpen(true)} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          <FeatureCard
            icon="🚨"
            title="Alerts Center"
            text="Open the live alerts workflow for state-wide notifications, fast updates, and command visibility."
            cta="Open Alerts"
            onClick={() => nav("/state/789/alerts")}
          />
          <FeatureCard
            icon="💬"
            title="Discussion Board"
            text="Jump into state discussion without digging through the older dashboard layout."
            cta="Open Discussion"
            onClick={() => nav("/state/789/discussion")}
          />
          <FeatureCard
            icon="🏆"
            title="Achievements"
            text="Use the redesigned achievements hub for requests, progress, tracking, and player-facing forms."
            cta="Open Achievements"
            onClick={() => nav("/state/789/achievements")}
          />
          <FeatureCard
            icon="🧵"
            title="Threads"
            text="Access state threads and communications from a cleaner landing layout."
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
            Everything important stays accessible, but the landing page is simplified so you can get where you need faster.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 14 }}>
            <CategoryTile title="Alerts" text="Emergency messaging, coordination, and state-wide alert control." />
            <CategoryTile title="Discussion" text="State communication and shared planning threads." />
            <CategoryTile title="Achievements" text="Player requests, progress tracking, approvals, and exports." />
            <CategoryTile title="Ops Console" text="Operational tools and active state control workflows." />
            <CategoryTile title="Threads" text="Communication threads and state collaboration." />
            <CategoryTile title="Legacy Panels" text="Older dashboard panels remain available in a drawer so nothing is lost." />
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <StepRow
            step="STEP 1"
            title="Pick the tool you need"
            text="Use the landing cards to jump directly into alerts, discussion, achievements, ops, or threads."
          />
          <StepRow
            step="STEP 2"
            title="Keep the old workflow available"
            text="The legacy State 789 dashboard is still preserved behind a drawer so the redesign does not remove working panels."
          />
          <StepRow
            step="STEP 3"
            title="Use this as the main state entry"
            text="This page becomes the cleaner front door for State 789 without changing the working routes underneath it."
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
