import React from "react";
import { useNavigate } from "react-router-dom";
import SupportBundleButton from "../../components/system/SupportBundleButton";
import { StateAchievementsRequestForm } from "../../components/state/StateAchievementsRequestForm";

function StepCard(props: { step: string; title: string; text: string }) {
  return (
    <div className="zombie-card" style={{ padding: 14, minHeight: 140 }}>
      <div style={{ opacity: 0.72, fontSize: 11, fontWeight: 900, letterSpacing: "0.12em" }}>{props.step}</div>
      <div style={{ fontSize: 18, fontWeight: 950, marginTop: 8 }}>{props.title}</div>
      <div style={{ opacity: 0.82, marginTop: 8, lineHeight: 1.55 }}>{props.text}</div>
    </div>
  );
}

export default function State789AchievementsFormPage() {
  const nav = useNavigate();

  return (
    <div style={{ padding: 14, display: "grid", gap: 12 }}>
      <div
        className="zombie-card"
        style={{
          padding: 20,
          background: "linear-gradient(180deg, rgba(14,18,24,0.96), rgba(6,8,12,0.92))",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div style={{ opacity: 0.72, fontSize: 11, fontWeight: 950, letterSpacing: "0.14em" }}>
          PLAYER REQUEST FORM
        </div>
        <div style={{ fontSize: 28, fontWeight: 950, marginTop: 8 }}>
          Request an Achievement
        </div>
        <div style={{ opacity: 0.84, marginTop: 10, lineHeight: 1.65, maxWidth: 920 }}>
          Use this page to submit an achievement request for review. Submissions keep the same approval path already in place —
          nothing changes in how leadership reviews or approves them.
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/state/789/achievements")}>
            ⬅ Achievements Home
          </button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/state/789/achievements-progress")}>
            📈 Progress
          </button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/state/789/achievements-tracker")}>
            🧾 Tracker
          </button>
          <SupportBundleButton />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        <StepCard
          step="STEP 1"
          title="Fill out the request"
          text="Enter your player name, alliance, and the achievement you are requesting. Choose an option or weapon when required."
        />
        <StepCard
          step="STEP 2"
          title="Submit for review"
          text="Your request follows the same current submission route and stays pending until leadership reviews it."
        />
        <StepCard
          step="STEP 3"
          title="Track approval and progress"
          text="After submission, leadership can approve and update progress using the same workflow already in place."
        />
      </div>

      <div className="zombie-card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 950, marginBottom: 8 }}>Important</div>
        <div style={{ opacity: 0.82, lineHeight: 1.6 }}>
          This page is only a cleaner player-facing entry point. It does not change the existing request handling, approval rules, or progress update flow.
        </div>
      </div>

      <div className="zombie-card" style={{ padding: 16 }}>
        <StateAchievementsRequestForm stateCode="789" />
      </div>
    </div>
  );
}
