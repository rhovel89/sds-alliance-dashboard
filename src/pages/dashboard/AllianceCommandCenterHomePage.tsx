import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";

function s(v: any) { return v === null || v === undefined ? "" : String(v); }

export default function AllianceCommandCenterHomePage() {
  const nav = useNavigate();
  const params = useParams();
  const code = s((params as any)?.alliance_id || (params as any)?.code || "").trim();

  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);
  function onSelectModule(k: string) { const to = cc.find((m) => m.key === k)?.to; if (to) nav(to); }

  const base = code ? `/dashboard/${encodeURIComponent(code)}` : "/dashboard";

  const tiles = [
    { title: "Guides", desc: "Doctrine + SOP + attachments", to: `${base}/guides` },
    { title: "Announcements", desc: "Broadcast orders", to: `${base}/announcements` },
    { title: "Calendar", desc: "Live ops schedule", to: `${base}/calendar` },
    { title: "HQ Map", desc: "Do NOT change layout", to: `${base}/hq-map` },
    { title: "My Profile", desc: "Per-alliance profile", to: `${base}/profile` },
  ];

  return (
    <CommandCenterShell
      title={`Alliance Command Center — ${code || "?"}`}
      subtitle="Alliance Ops • zombie command center • RLS enforced"
      modules={modules}
      activeModuleKey="alliance"
      onSelectModule={onSelectModule}
      topRight={
        <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
          <button className="zombie-btn" type="button" onClick={() => nav("/state/789")}>State 789</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/approval-center")}>Approval Center</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/me/dossier")}>My Dossier</button>
        </div>
      }
    >
      <div className="z-flicker" style={{ opacity: 0.75, fontSize: 12, marginBottom: 10 }}>
        HQ Map stays unchanged. Use tiles for fast ops navigation.
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
        {tiles.map((t) => (
          <button
            key={t.to}
            className="zombie-btn"
            type="button"
            style={{ textAlign:"left", whiteSpace:"normal", padding:"12px 12px" }}
            onClick={() => nav(t.to)}
          >
            <div style={{ fontWeight: 950, fontSize: 15 }}>{t.title}</div>
            <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>{t.desc}</div>
          </button>
        ))}
      </div>
    </CommandCenterShell>
  );
}
