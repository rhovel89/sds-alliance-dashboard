import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";
import MyDashboardsPage from "./MyDashboardsPage";

function groupFor(to: string) {
  const t = String(to || "");
  if (t.startsWith("/owner")) return "Owner Ops";
  if (t.startsWith("/state/789")) return "State 789";
  if (t.startsWith("/dashboard")) return "Dashboards";
  if (t.startsWith("/me") || t.startsWith("/dossier")) return "Identity";
  return "Tools";
}

export default function DashboardCommandCenterPage() {
  const nav = useNavigate();
  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);

  function onSelectModule(k: string) {
    const to = cc.find((m) => m.key === k)?.to;
    if (to) nav(to);
  }

  const buckets = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const m of cc) {
      const g = groupFor(m.to);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(m);
    }
    return Array.from(map.entries());
  }, [cc]);

  return (
    <CommandCenterShell
      title="Operations Hub"
      subtitle="All systems • zombie command center • RLS enforced"
      modules={modules}
      activeModuleKey="dashboard"
      onSelectModule={onSelectModule}
      topRight={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="zombie-btn" type="button" onClick={() => nav("/me/dossier")}>My Dossier</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/approval-center")}>Approval Center</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/state/789")}>State 789</button>
        </div>
      }
    >
      <div className="z-flicker" style={{ opacity: 0.75, fontSize: 12, marginBottom: 10 }}>
        Command: pick a module → execute → monitor. (UI hints only; Supabase RLS enforces.)
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950, marginBottom: 10 }}>Quick Modules</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            {buckets.map(([g, arr]) => (
              <div key={g} style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.18)", borderRadius: 14, padding: 10 }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>{g}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(arr as any[]).slice(0, 6).map((m: any) => (
                    <button
                      key={m.key}
                      className="zombie-btn"
                      type="button"
                      style={{ textAlign: "left", whiteSpace: "normal" }}
                      onClick={() => nav(m.to)}
                    >
                      <div style={{ fontWeight: 900 }}>{String(m.label || m.key)}</div>
                      <div style={{ fontSize: 12, opacity: 0.72 }}>{String(m.hint || m.to)}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Keep existing dashboard list + features under the new shell */}
        <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950, marginBottom: 10 }}>My Dashboards</div>
          <MyDashboardsPage />
        </div>
      </div>
    </CommandCenterShell>
  );
}
