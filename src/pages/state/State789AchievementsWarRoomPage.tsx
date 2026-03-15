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

export default function State789AchievementsWarRoomPage() {
  const nav = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

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
            <Pill text="PLAYER REQUESTS" />
            <Pill text="APPROVALS UNCHANGED" />
          </div>

          <div style={{ fontSize: 34, fontWeight: 950, marginTop: 14, lineHeight: 1.05 }}>
            Achievements Hub
          </div>

          <div style={{ opacity: 0.86, marginTop: 12, lineHeight: 1.7, maxWidth: 980, fontSize: 15 }}>
            This is the clean player-facing home for achievements in State 789. Players can open a direct request form,
            leadership can keep the current approval path, and progress tracking stays exactly where it already works.
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
            <HeroAction primary label="📝 Request an Achievement" onClick={() => nav("/state/789/achievements/request")} />
            <HeroAction label="📈 Progress" onClick={() => nav("/state/789/achievements-progress")} />
            <HeroAction label="🧾 Tracker" onClick={() => nav("/state/789/achievements-tracker")} />
            <HeroAction label="📡 Export / Send" onClick={() => setDrawerOpen(true)} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          <FeatureCard
            icon="📝"
            title="Direct Player Form"
            text="Give players one simple link to submit achievement requests without walking through the full command page."
            cta="Open Form"
            onClick={() => nav("/state/789/achievements/request")}
          />
          <FeatureCard
            icon="📈"
            title="Progress Views"
            text="Players and leadership can review progress from the existing progress page without changing how approvals work."
            cta="Open Progress"
            onClick={() => nav("/state/789/achievements-progress")}
          />
          <FeatureCard
            icon="🧾"
            title="Tracker"
            text="Use the tracker for live request review and request movement while keeping the player entry point separate and clean."
            cta="Open Tracker"
            onClick={() => nav("/state/789/achievements-tracker")}
          />
        </div>

        <div
          className="zombie-card"
          style={{
            padding: 18,
            background: "linear-gradient(180deg, rgba(14,16,20,0.96), rgba(8,10,14,0.92))",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 950 }}>Popular request categories</div>
          <div style={{ opacity: 0.8, marginTop: 8, lineHeight: 1.6 }}>
            These are examples of the kinds of achievement requests players commonly submit. The actual request and approval pipeline stays the same.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 14 }}>
            <CategoryTile title="Governor Rotations" text="Submit rotation milestones and let leadership update your progress through the current review flow." />
            <CategoryTile title="Weapon / Build Requests" text="Pick an achievement and choose the required option or weapon when the type requires it." />
            <CategoryTile title="Completion Progress" text="Track submitted items and watch progress move from submitted to approved or completed." />
            <CategoryTile title="Leadership Review" text="Owners and approved helpers continue reviewing requests through the same current pathway." />
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <StepRow
            step="STEP 1"
            title="Players submit a request"
            text="Use the direct request form link to enter your player name, alliance, and the achievement you want reviewed."
          />
          <StepRow
            step="STEP 2"
            title="Leadership reviews and approves"
            text="Nothing changes in the approval flow. The same owner-side queue and review steps continue to handle requests."
          />
          <StepRow
            step="STEP 3"
            title="Progress stays visible"
            text="Progress and tracker views remain active, so players and leaders can keep using the existing pages that already work."
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
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/state/789")}>
              ⬅ Back to State
            </button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/state/789/achievements/request")}>
              Player Form
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
