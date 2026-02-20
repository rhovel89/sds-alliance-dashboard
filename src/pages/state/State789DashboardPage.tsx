import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AllianceThemePicker } from "../../components/theme/AllianceThemePicker";

function Card(props: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="zombie-card"
      style={{
        padding: 14,
        borderRadius: 16,
        background: "var(--sad-card, rgba(0,0,0,0.35))",
        border: "1px solid var(--sad-border, rgba(120,255,120,0.18))",
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 8 }}>{props.title}</div>
      {props.children}
    </div>
  );
}

export default function State789DashboardPage() {
  const nav = useNavigate();

  const widgets = useMemo(
    () => [
      { title: "📣 State Broadcast (placeholder)", body: "Future: state-wide announcements + scheduled posts + Discord bot integration." },
      { title: "🗓 State Events (placeholder)", body: "Future: state events + reminders + calendar templates." },
      { title: "🏆 Achievements (placeholder)", body: "Future: state achievement workflow + progress bars + approvals." },
      { title: "🧭 Alliance Directory", body: "Multi-alliance directory view (live list page)." },
    ],
    []
  );

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>🛰 State 789 Dashboard</div>

        <button className="zombie-btn" style={{ height: 34, padding: "0 12px" }} onClick={() => nav("/alliances")}>
          🧭 Alliance Directory
        </button>

        <button className="zombie-btn" style={{ height: 34, padding: "0 12px" }} onClick={() => nav("/status")}>
          🧪 /status
        </button>

        <button className="zombie-btn" style={{ height: 34, padding: "0 12px" }} onClick={() => nav("/me")}>
          🧟 /me
        </button>
      </div>

      <div style={{ marginTop: 12, maxWidth: 720 }}>
        <AllianceThemePicker allianceCode={null} />
      </div>

      <div style={{ display: "grid", gap: 12, marginTop: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {widgets.map((w) => (
          <Card key={w.title} title={w.title}>
            <div style={{ opacity: 0.85, whiteSpace: "pre-wrap" }}>{w.body}</div>
            {w.title.includes("Directory") ? (
              <div style={{ marginTop: 10 }}>
                <button className="zombie-btn" style={{ height: 34, padding: "0 12px" }} onClick={() => nav("/alliances")}>
                  Open Directory
                </button>
              </div>
            ) : null}
          </Card>
        ))}
      </div>

      <div style={{ marginTop: 14, fontSize: 12, opacity: 0.7 }}>
        UI shell only (no DB yet). Built to be expanded with Supabase tables + Realtime + Discord bot.
      </div>
    </div>
  );
}