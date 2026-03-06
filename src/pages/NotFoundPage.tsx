import React, { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import CommandCenterShell from "../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../components/commandcenter/ccModules";

export default function NotFoundPage() {
  const nav = useNavigate();
  const loc = useLocation();

  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);

  function onSelectModule(k: string) {
    const to = cc.find((m) => m.key === k)?.to;
    if (to) nav(to);
  }

  const path = String(loc.pathname || "");

  return (
    <CommandCenterShell
      title="Signal Lost — Route Not Found"
      subtitle="Unknown corridor. Return to command."
      modules={modules}
      activeModuleKey="dash"
      onSelectModule={onSelectModule}
      topRight={
        <button className="zombie-btn" type="button" onClick={() => window.location.reload()}>
          Reload
        </button>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            border: "1px solid rgba(176,18,27,0.35)",
            background: "rgba(176,18,27,0.12)",
            borderRadius: 14,
            padding: 12,
          }}
        >
          <div style={{ fontWeight: 950, letterSpacing: 0.4, textTransform: "uppercase", fontSize: 12 }}>
            🩸 404 — Corridor blocked
          </div>
          <div style={{ marginTop: 8, opacity: 0.85 }}>
            Requested path: <code style={{ opacity: 0.95 }}>{path}</code>
          </div>
          <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>
            This page prevents silent redirects. Choose a safe route below.
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 950 }}>Dashboard</div>
            <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>Alliance selection + quick links.</div>
            <button className="zombie-btn" type="button" style={{ marginTop: 10 }} onClick={() => nav("/dashboard")}>
              Go /dashboard
            </button>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 950 }}>State 789</div>
            <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>Primary war room hub.</div>
            <button className="zombie-btn" type="button" style={{ marginTop: 10 }} onClick={() => nav("/state/789")}>
              Go /state/789
            </button>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 950 }}>Threads</div>
            <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>Ops comms + Discord notify.</div>
            <button className="zombie-btn" type="button" style={{ marginTop: 10 }} onClick={() => nav("/state/789/threads")}>
              Go /state/789/threads
            </button>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 950 }}>Owner</div>
            <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>Authority + ops console.</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
              <button className="zombie-btn" type="button" onClick={() => nav("/owner")}>Go /owner</button>
              <button className="zombie-btn" type="button" onClick={() => nav("/owner/ops")}>Go /owner/ops</button>
            </div>
          </div>
        </div>
      </div>
    </CommandCenterShell>
  );
}
