import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import WeeklyAgendaCard from "../../components/dashboard/WeeklyAgendaCard";

import ActionDrawer from "../../components/commandcenter/ActionDrawer";
import LegacyMe from "./MeDashboardPage";

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

export default function MeCommandCenterPage() {
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
            <Pill text="MY DOSSIER" />
            <Pill text="PERSONAL HUB" />
            <Pill text="MAIL + STATE + HQ" />
            <Pill text="LEGACY PRESERVED" />
          </div>

          <div style={{ fontSize: 34, fontWeight: 950, marginTop: 14, lineHeight: 1.05 }}>
            Personal Command Center
          </div>

          <div style={{ opacity: 0.86, marginTop: 12, lineHeight: 1.7, maxWidth: 980, fontSize: 15 }}>
            A cleaner front door for your personal dashboard. Use this hub to jump straight into mail, dossier, HQ tools,
            state pages, and alliance tools while keeping the full existing personal dashboard available when needed.
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
            <HeroAction primary label="📬 Mail" onClick={() => nav("/mail")} />
            <HeroAction label="🧾 My Dossier" onClick={() => nav("/me/dossier")} />
            <HeroAction label="🏰 HQ Manager" onClick={() => nav("/me/hq-manager")} />
            <HeroAction label="🗺️ State Hub" onClick={() => nav("/state/789")} />
            <HeroAction label="🧟 Legacy Panels" onClick={() => setLegacyOpen(true)} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <MiniStat label="MAIL" value="READY" sub="Inbox and thread access" />
          <MiniStat label="DOSSIER" value="LIVE" sub="Personal info and tools" />
          <MiniStat label="HQ" value="MANAGE" sub="Profile and HQ workflow" />
          <MiniStat label="STATE" value="789" sub="Fast access to state tools" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          <FeatureCard
            icon="📬"
            title="Mail Center"
            text="Jump directly into your inbox and thread view without loading the full personal dashboard first."
            cta="Open Mail"
            onClick={() => nav("/mail")}
          />
          <FeatureCard
            icon="🧾"
            title="My Dossier"
            text="Open your dossier and personal identity pages from a cleaner, more focused hub layout."
            cta="Open Dossier"
            onClick={() => nav("/me/dossier")}
          />
          <FeatureCard
            icon="🏰"
            title="HQ Manager"
            text="Go directly to HQ and profile management tools without digging through the larger page."
            cta="Open HQ Manager"
            onClick={() => nav("/me/hq-manager")}
          />
          <FeatureCard
            icon="🗺️"
            title="State Hub"
            text="Move from your personal hub into the State 789 command pages with one click."
            cta="Open State Hub"
            onClick={() => nav("/state/789")}
          />
        </div>

        <div
          className="zombie-card"
          style={{
            padding: 18,
            background: "linear-gradient(180deg, rgba(14,16,20,0.96), rgba(8,10,14,0.92))",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 950 }}>Core personal tools</div>
          <div style={{ opacity: 0.8, marginTop: 8, lineHeight: 1.6 }}>
            This page is now a cleaner launch hub, while the current working personal dashboard stays available behind a drawer.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 14 }}>
            <CategoryTile title="Mail" text="Inbox, thread access, and fast message review." />
            <CategoryTile title="Dossier" text="Identity, profile, and personal command access." />
            <CategoryTile title="HQ Manager" text="HQ and alliance profile management tools." />
            <CategoryTile title="State Access" text="Fast jump into State 789 operations and pages." />
            <CategoryTile title="Achievements" text="Direct access to the player and state achievement flow." />
            <CategoryTile title="Legacy Dashboard" text="Older personal panels remain available in a drawer, not removed." />
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <StepRow
            step="STEP 1"
            title="Choose the area you need"
            text="Use the launch cards to go straight into mail, dossier, HQ tools, or the state hub."
          />
          <StepRow
            step="STEP 2"
            title="Keep the current workflow intact"
            text="This redesign only changes the landing experience. The existing tools and routes underneath remain the same."
          />
          <StepRow
            step="STEP 3"
            title="Open legacy panels only when needed"
            text="The previous personal dashboard remains available in a drawer so you do not lose any current functionality."
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
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/mail")}>
              Mail
            </button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/mail-threads")}>
              Threads
            </button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/me/dossier")}>
              My Dossier
            </button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/me/hq-manager")}>
              HQ Manager
            </button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/state/789/achievements")}>
              Achievements
            </button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => setLegacyOpen(true)}>
              Open Legacy Panels
            </button>
          </div>
        </div>
      </div>

      <ActionDrawer open={legacyOpen} title="Legacy Personal Dashboard" onClose={() => setLegacyOpen(false)}>
        <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 10 }}>
          Legacy personal dashboard preserved here so the redesign does not remove working panels.
        </div>
        <LegacyMe />
      </ActionDrawer>
    </>
  );
}



