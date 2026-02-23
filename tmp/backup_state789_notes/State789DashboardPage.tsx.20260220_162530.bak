import React, { useMemo, useState } from "react";
import { RealtimeStatusBadge } from "../../components/system/RealtimeStatusBadge";

type Widget = { title: string; body: string; emoji: string };

const DEFAULT: Widget[] = [
  { title: "State Alerts", emoji: "🚨", body: "UI-only placeholder. Later: state-wide announcements + pings." },
  { title: "Upcoming State Events", emoji: "🗓️", body: "UI-only placeholder. Later: pulls from state calendar + alliance feeds." },
  { title: "War Room Notes", emoji: "🧠", body: "UI-only placeholder. Later: realtime notes + pinned objectives." },
  { title: "Achievements Tracker", emoji: "🏆", body: "UI-only placeholder. Later: progress bars + approval workflow." },
];

export default function State789DashboardPage() {
  const [widgets] = useState<Widget[]>(DEFAULT);

  const title = useMemo(() => "🧟 State 789 Dashboard", []);

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <RealtimeStatusBadge allianceCode={null} />
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        {widgets.map((w) => (
          <div key={w.title} className="zombie-card">
            <div style={{ fontWeight: 900, marginBottom: 8 }}>{w.emoji} {w.title}</div>
            <div style={{ opacity: 0.85, fontSize: 13, lineHeight: "18px" }}>{w.body}</div>
            <div style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>Later: connect to Supabase + RLS + realtime.</div>
          </div>
        ))}
      </div>
    </div>
  );
}