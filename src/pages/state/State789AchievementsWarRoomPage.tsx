import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ActionDrawer from "../../components/commandcenter/ActionDrawer";
import StateAchievementsExportPanel from "../../components/state/StateAchievementsExportPanel";

function HeroCard(props: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="zombie-card"
      style={{
        padding: 20,
        background: "linear-gradient(180deg, rgba(14,18,24,0.96), rgba(6,8,12,0.92))",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <div style={{ opacity: 0.72, fontSize: 11, fontWeight: 950, letterSpacing: "0.14em" }}>
        STATE 789 • ACHIEVEMENTS
      </div>
      <div style={{ fontSize: 30, fontWeight: 950, marginTop: 8, lineHeight: 1.1 }}>
        {props.title}
      </div>
      <div style={{ opacity: 0.84, marginTop: 10, lineHeight: 1.65, maxWidth: 920 }}>
        {props.subtitle}
      </div>
      {props.children ? <div style={{ marginTop: 16 }}>{props.children}</div> : null}
    </div>
  );
}

function InfoCard(props: {
  eyebrow: string;
  title: string;
  body: string;
  cta?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className="zombie-card"
      style={{
        padding: 16,
        minHeight: 180,
        display: "grid",
        gap: 10,
        alignContent: "start",
      }}
    >
      <div style={{ opacity: 0.7, fontSize: 11, fontWeight: 900, letterSpacing: "0.12em" }}>{props.eyebrow}</div>
      <div style={{ fontSize: 20, fontWeight: 950 }}>{props.title}</div>
      <div style={{ opacity: 0.82, lineHeight: 1.55 }}>{props.body}</div>
      {props.cta && props.onClick ? (
        <div>
          <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: 900 }} onClick={props.onClick}>
            {props.cta}
          </button>
        </div>
      ) : null}
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

export default function State789AchievementsWarRoomPage() {
  const nav = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <div style={{ display: "grid", gap: 12 }}>
        <HeroCard
          title="Achievements Command Center"
          subtitle="A cleaner player-facing hub for requests, progress, and tracking. The approval flow stays exactly the same — players submit requests, leadership reviews them, and approved progress continues through the existing pathway."
        >
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              className="zombie-btn"
              style={{ padding: "10px 12px", fontWeight: 900 }}
              onClick={() => nav("/state/789/achievements/request")}
            >
              📝 Request an Achievement
            </button>
            <button
              className="zombie-btn"
              style={{ padding: "10px 12px" }}
              onClick={() => nav("/state/789/achievements-progress")}
            >
              📈 Progress
            </button>
            <button
              className="zombie-btn"
              style={{ padding: "10px 12px" }}
              onClick={() => nav("/state/789/achievements-tracker")}
            >
              🧾 Tracker
            </button>
            <button
              className="zombie-btn"
              style={{ padding: "10px 12px" }}
              onClick={() => setDrawerOpen(true)}
            >
              📡 Export / Send
            </button>
          </div>
        </HeroCard>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <MiniStat label="PLAYER ENTRY" value="DIRECT LINK" sub="One clean request page for players" />
          <MiniStat label="APPROVAL FLOW" value="UNCHANGED" sub="Keeps the current owner approval process" />
          <MiniStat label="PROGRESS" value="LIVE TOOLS" sub="Tracker and progress pages stay active" />
          <MiniStat label="SUBMISSIONS" value="SAME PATH" sub="No new backend flow introduced" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          <InfoCard
            eyebrow="STEP 1"
            title="Players submit requests"
            body="Use the dedicated request form link for achievement submissions. This keeps the player experience simple while still feeding the same approval queue."
            cta="Open Request Form"
            onClick={() => nav("/state/789/achievements/request")}
          />
          <InfoCard
            eyebrow="STEP 2"
            title="Leadership reviews progress"
            body="Leadership keeps using the same review and progress workflow. Nothing changes in the approval path, only the layout around it gets cleaned up."
            cta="Open Progress"
            onClick={() => nav("/state/789/achievements-progress")}
          />
          <InfoCard
            eyebrow="STEP 3"
            title="Track requests and movement"
            body="Use the tracker to follow requests already in motion. This stays separate from the player form so the page is easier to navigate."
            cta="Open Tracker"
            onClick={() => nav("/state/789/achievements-tracker")}
          />
        </div>

        <div
          className="zombie-card"
          style={{
            padding: 16,
            background: "linear-gradient(180deg, rgba(16,18,22,0.96), rgba(10,12,16,0.92))",
          }}
        >
          <div style={{ fontWeight: 950, fontSize: 18 }}>How this works</div>
          <div style={{ marginTop: 10, opacity: 0.84, lineHeight: 1.65 }}>
            Players submit an achievement request through the direct form. The request goes through the same existing submission pipeline and still requires approval.
            Once reviewed, progress and final status continue through the same current owner flow.
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/state/789")}>
              ⬅ Back to State
            </button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/state/789/achievements/request")}>
              Player Form Link
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
