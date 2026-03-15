import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";
import ActionDrawer from "../../components/commandcenter/ActionDrawer";
import StateAchievementsExportPanel from "../../components/state/StateAchievementsExportPanel";

import LegacyAchievementsPage from "./State789AchievementsPage";

function StatCard(props: { label: string; value: string; sub?: string }) {
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
      <div style={{ opacity: 0.72, fontSize: 11, fontWeight: 900, letterSpacing: "0.12em" }}>
        {props.label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 950, lineHeight: 1.1 }}>{props.value}</div>
      <div style={{ opacity: 0.72, fontSize: 12 }}>{props.sub || ""}</div>
    </div>
  );
}

function ActionTile(props: { title: string; text: string; cta: string; onClick: () => void }) {
  return (
    <div
      className="zombie-card"
      style={{
        padding: 16,
        display: "grid",
        gap: 10,
        minHeight: 170,
      }}
    >
      <div style={{ fontWeight: 950, fontSize: 18 }}>{props.title}</div>
      <div style={{ opacity: 0.82, lineHeight: 1.5 }}>{props.text}</div>
      <div>
        <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: 900 }} onClick={props.onClick}>
          {props.cta}
        </button>
      </div>
    </div>
  );
}

export default function State789AchievementsWarRoomPage() {
  const nav = useNavigate();
  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);

  const [drawerOpen, setDrawerOpen] = useState(false);

  function onSelectModule(k: string) {
    const to = cc.find((m) => m.key === k)?.to;
    if (to) nav(to);
  }

  return (
    <CommandCenterShell
      title="State 789 — Achievements Dossier"
      subtitle="Player requests • progress review • exports • approvals"
      modules={modules}
      activeModuleKey="ach789"
      onSelectModule={onSelectModule}
      topRight={
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="zombie-btn" onClick={() => nav("/state/789/achievements-form")}>
            Player Form
          </button>
          <button type="button" className="zombie-btn" onClick={() => setDrawerOpen(true)}>
            Export / Send
          </button>
        </div>
      }
    >
      <div style={{ display: "grid", gap: 12 }}>
        <div
          className="zombie-card"
          style={{
            padding: 18,
            background: "linear-gradient(180deg, rgba(10,12,16,0.94), rgba(0,0,0,0.86))",
          }}
        >
          <div style={{ opacity: 0.72, fontSize: 11, fontWeight: 950, letterSpacing: "0.14em" }}>
            ACHIEVEMENT COMMAND
          </div>
          <div style={{ fontSize: 28, fontWeight: 950, marginTop: 8 }}>
            State 789 Achievements
          </div>
          <div style={{ opacity: 0.84, marginTop: 8, lineHeight: 1.6, maxWidth: 900 }}>
            Track requests, review progress, and keep the approval flow organized without changing the current submission pipeline.
            Players can use the direct request form, while leadership keeps the same review and approval path already in place.
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: 900 }} onClick={() => nav("/state/789/achievements-form")}>
              📝 Request an Achievement
            </button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/state/789/achievements-progress")}>
              📈 View Progress
            </button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/state/789/achievements-tracker")}>
              🧾 Open Tracker
            </button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/owner/state-achievements")}>
              🔐 Owner Queue
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <StatCard label="PLAYER ENTRY" value="DIRECT FORM" sub="Simple public-facing request page" />
          <StatCard label="APPROVAL FLOW" value="UNCHANGED" sub="Keeps existing owner review path" />
          <StatCard label="PROGRESS" value="LIVE VIEWS" sub="Use progress and tracker pages as-is" />
          <StatCard label="EXPORTS" value="READY" sub="Keep current export/send workflow" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          <ActionTile
            title="Player Request Form"
            text="Give players one clean link they can use directly without sending them through the full command page."
            cta="Open Request Form"
            onClick={() => nav("/state/789/achievements-form")}
          />
          <ActionTile
            title="Progress + Tracker"
            text="Keep the tracker and progress pages separate so players and leaders can review movement without touching the request workflow."
            cta="Open Progress"
            onClick={() => nav("/state/789/achievements-progress")}
          />
          <ActionTile
            title="Owner Review Queue"
            text="Leadership continues approving and updating requests through the same owner workflow already in use."
            cta="Open Owner Queue"
            onClick={() => nav("/owner/state-achievements")}
          />
        </div>

        <div className="zombie-card" style={{ padding: 12 }}>
          <div style={{ fontWeight: 950, marginBottom: 8 }}>Live Requests + Visibility</div>
          <div style={{ opacity: 0.8, lineHeight: 1.6 }}>
            The full request board remains below so nothing in the current achievements workflow is lost. This redesign only improves the entry
            experience and organization around it.
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <LegacyAchievementsPage />
        </div>
      </div>

      <ActionDrawer open={drawerOpen} title="Dossier Export" onClose={() => setDrawerOpen(false)}>
        <StateAchievementsExportPanel stateCode="789" />
      </ActionDrawer>
    </CommandCenterShell>
  );
}
