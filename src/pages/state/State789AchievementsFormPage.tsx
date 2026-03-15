import React from "react";
import { useNavigate } from "react-router-dom";
import SupportBundleButton from "../../components/system/SupportBundleButton";
import { StateAchievementsRequestForm } from "../../components/state/StateAchievementsRequestForm";

function InfoTile(props: { title: string; text: string }) {
  return (
    <div
      className="zombie-card"
      style={{
        padding: 14,
        minHeight: 130,
        display: "grid",
        gap: 8,
        background: "rgba(0,0,0,0.26)",
      }}
    >
      <div style={{ fontWeight: 950, fontSize: 16 }}>{props.title}</div>
      <div style={{ opacity: 0.82, lineHeight: 1.55 }}>{props.text}</div>
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
          background: "linear-gradient(180deg, rgba(16,20,26,0.98), rgba(8,10,14,0.94))",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div style={{ opacity: 0.72, fontSize: 11, fontWeight: 950, letterSpacing: "0.14em" }}>
          DIRECT PLAYER FORM
        </div>
        <div style={{ fontSize: 30, fontWeight: 950, marginTop: 8, lineHeight: 1.08 }}>
          Request an Achievement
        </div>
        <div style={{ opacity: 0.86, marginTop: 10, lineHeight: 1.7, maxWidth: 920 }}>
          Submit your achievement request here. This page is only a cleaner player entry point — the request still follows the
          same current submit and approval path used today.
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: 900 }} onClick={() => nav("/state/789/achievements")}>
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
        <InfoTile
          title="Fill out your request"
          text="Enter your player name, alliance, and achievement details. Choose a required option or weapon when needed."
        />
        <InfoTile
          title="Submit for review"
          text="Your request follows the same current request pipeline and remains subject to leadership review and approval."
        />
        <InfoTile
          title="Track it later"
          text="Use the tracker and progress pages to follow your submitted request once it enters the review flow."
        />
      </div>

      <div className="zombie-card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 950, marginBottom: 8 }}>Before you submit</div>
        <div style={{ opacity: 0.82, lineHeight: 1.6 }}>
          Double-check your player name, alliance, and selected achievement. This keeps the owner review queue cleaner and helps your request move faster.
        </div>
      </div>

      <div
        className="zombie-card"
        style={{
          padding: 16,
          background: "linear-gradient(180deg, rgba(14,16,20,0.96), rgba(8,10,14,0.92))",
        }}
      >
        <StateAchievementsRequestForm stateCode="789" />
      </div>
    </div>
  );
}
