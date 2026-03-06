import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";

export default function State789CommandCenterHomePage() {
  const nav = useNavigate();
  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);
  function onSelectModule(k: string) { const to = cc.find((m) => m.key === k)?.to; if (to) nav(to); }

  const picks = cc.filter((m) =>
    String(m.to || "").startsWith("/state/789") ||
    String(m.to || "") === "/owner/state-achievements" ||
    String(m.to || "") === "/owner/state-achievement-inbox" ||
    String(m.to || "") === "/owner/ops" ||
    String(m.to || "") === "/owner/approval-center"
  );

  return (
    <CommandCenterShell
      title="State 789 Command Center"
      subtitle="State Ops • dossier + threads + achievements • RLS enforced"
      modules={modules}
      activeModuleKey="state789"
      onSelectModule={onSelectModule}
      topRight={
        <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
          <button className="zombie-btn" type="button" onClick={() => nav("/dashboard")}>Dashboard</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/me/dossier")}>My Dossier</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/approval-center")}>Approval Center</button>
        </div>
      }
    >
      <div className="z-flicker" style={{ opacity: 0.75, fontSize: 12, marginBottom: 10 }}>
        Fast intel routing. Export + Discord send uses queue_discord_send RPC.
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
        {picks.map((m) => (
          <button
            key={m.key}
            className="zombie-btn"
            type="button"
            style={{ textAlign:"left", whiteSpace:"normal", padding:"12px 12px" }}
            onClick={() => nav(m.to)}
          >
            <div style={{ fontWeight: 950, fontSize: 15 }}>{String(m.label || m.key)}</div>
            <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>{String(m.hint || m.to)}</div>
          </button>
        ))}
      </div>
    </CommandCenterShell>
  );
}
