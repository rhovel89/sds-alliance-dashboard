import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ActionDrawer from "../../components/commandcenter/ActionDrawer";
import StateAchievementsExportPanel from "../../components/state/StateAchievementsExportPanel";

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
        border: "1px solid rgba(255,255,255,0.10)",
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

function InfoCard(props: { title: string; text: string }) {
  return (
    <div
      className="zombie-card"
      style={{
        padding: 16,
        minHeight: 120,
        display: "grid",
        gap: 8,
        background: "rgba(0,0,0,0.22)",
      }}
    >
      <div style={{ fontWeight: 950, fontSize: 16 }}>{props.title}</div>
      <div style={{ opacity: 0.8, lineHeight: 1.6 }}>{props.text}</div>
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

export default function State789AchievementsWarRoomPage() {
  const nav = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <div style={{ padding: 16, maxWidth: 1400, margin: "0 auto", display: "grid", gap: 12 }}>
        <div
          className="zombie-card"
          style={{
            padding: 22,
            background: "linear-gradient(180deg, rgba(16,20,26,0.98), rgba(8,10,14,0.94))",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ minWidth: 280 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                <Pill text="STATE ACHIEVEMENTS" />
                <Pill text="PLAYER HUB" />
                <Pill text="STATE 789" />
              </div>

              <h2 style={{ margin: 0, fontSize: 30, lineHeight: 1.05 }}>State 789 Achievements Hub</h2>

              <div style={{ opacity: 0.86, marginTop: 12, lineHeight: 1.7, maxWidth: 980, fontSize: 15 }}>
                Clean player-facing home for achievement requests, progress checks, tracker access, and export tools.
                The approval and review flow stays exactly where it already works.
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/state/789")}>
                ⬅ Back to State
              </button>
              <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/owner/state-achievements")}>
                Owner Queue
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
            <HeroAction primary label="📝 Request an Achievement" onClick={() => nav("/state/789/achievements/request")} />
            <HeroAction label="📈 Progress" onClick={() => nav("/state/789/achievements-progress")} />
            <HeroAction label="🧾 Tracker" onClick={() => nav("/state/789/achievements-tracker")} />
            <HeroAction label="📡 Export / Send" onClick={() => setDrawerOpen(true)} />
          </div>
        </div>

        <div
          className="zombie-card"
          style={{
            padding: 14,
            background: "rgba(0,0,0,0.20)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            <InfoCard
              title="What this page is"
              text="A clean front door for players and leaders to jump into the achievements workflow without changing how the real request pipeline works."
            />
            <InfoCard
              title="What stays unchanged"
              text="Approvals, tracking, progress handling, and export behavior keep using the same pages and tools that are already working."
            />
            <InfoCard
              title="Best fast path"
              text="Most players should use the request form first. Leadership can jump straight to tracker, progress, or export/send tools."
            />
          </div>
        </div>

        <div
          className="zombie-card"
          style={{
            padding: 14,
            background: "rgba(0,0,0,0.22)",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 8 }}>Launch tools</div>
          <div style={{ opacity: 0.72, fontSize: 12, marginBottom: 12 }}>
            Use the same working achievements pages, but from a cleaner landing page.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            <FeatureCard
              icon="📝"
              title="Direct Player Form"
              text="Give players one simple link to submit an achievement request with their player name, alliance, and achievement details."
              cta="Open Form"
              onClick={() => nav("/state/789/achievements/request")}
            />
            <FeatureCard
              icon="📈"
              title="Progress Views"
              text="Review progress using the current progress page without changing any of the review or approval logic behind it."
              cta="Open Progress"
              onClick={() => nav("/state/789/achievements-progress")}
            />
            <FeatureCard
              icon="🧾"
              title="Tracker"
              text="Use the tracker for live request visibility and request movement while keeping the player entry point clean and focused."
              cta="Open Tracker"
              onClick={() => nav("/state/789/achievements-tracker")}
            />
            <FeatureCard
              icon="📡"
              title="Export / Discord"
              text="Open the export panel and send achievements output without leaving the achievements hub."
              cta="Open Export Tools"
              onClick={() => setDrawerOpen(true)}
            />
          </div>
        </div>

        <div
          className="zombie-card"
          style={{
            padding: 18,
            background: "linear-gradient(180deg, rgba(14,16,20,0.96), rgba(8,10,14,0.92))",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 950 }}>Common achievement flow</div>
          <div style={{ opacity: 0.8, marginTop: 8, lineHeight: 1.6 }}>
            The page is cleaner, but the request and approval path stays the same.
          </div>

          <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
            <StepRow
              step="STEP 1"
              title="Players submit a request"
              text="Use the direct request form to enter player details, alliance, and the achievement or option that needs review."
            />
            <StepRow
              step="STEP 2"
              title="Leadership reviews the request"
              text="Nothing changes in the owner or helper workflow. The same queue and review tools continue handling approvals."
            />
            <StepRow
              step="STEP 3"
              title="Progress remains visible"
              text="Progress and tracker views remain active so players and leaders can keep using the pages that already work."
            />
          </div>
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
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/state/789/achievements/request")}>
              Player Form
            </button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/state/789/achievements-progress")}>
              Progress
            </button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/state/789/achievements-tracker")}>
              Tracker
            </button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => setDrawerOpen(true)}>
              Export / Send
            </button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/owner/state-achievements")}>
              Owner Queue
            </button>
          </div>
        </div>
      </div>

      <ActionDrawer open={drawerOpen} title="Dossier Export" onClose={() => setDrawerOpen(false)}>
        <StateAchievementsExportPanel stateCode="789" />
      </ActionDrawer>
    </>
  );
}
