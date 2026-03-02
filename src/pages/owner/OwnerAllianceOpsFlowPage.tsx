import React, { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import RequireAdmin from "../../components/auth/RequireAdmin";

import OwnerAlliancesPage from "./OwnerAlliancesPage";
import OwnerAllianceDirectoryEditorPage from "./OwnerAllianceDirectoryEditorPage";
import OwnerDiscordDefaultsPage from "./OwnerDiscordDefaultsPage";
import OwnerAlliancePermissionsHubPage from "./OwnerAlliancePermissionsHubPage";
import OwnerRolesPermissionsV2Page from "./OwnerRolesPermissionsV2Page";

type StepDef = {
  id: "alliances" | "directory" | "discord" | "permissions" | "roles";
  title: string;
  render: () => JSX.Element;
};

const BUILD_STAMP = "20260301-232052";

const STEPS: StepDef[] = [
  { id: "alliances", title: "Alliances", render: () => <OwnerAlliancesPage /> },
  { id: "directory", title: "Directory", render: () => <OwnerAllianceDirectoryEditorPage /> },
  { id: "discord", title: "Discord", render: () => <OwnerDiscordDefaultsPage /> },
  { id: "permissions", title: "Permissions", render: () => <OwnerAlliancePermissionsHubPage /> },
  { id: "roles", title: "Roles", render: () => <OwnerRolesPermissionsV2Page /> },
];

class StepBoundary extends React.Component<
  { stepId: string; children: React.ReactNode },
  { error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { error };
  }
  componentDidCatch(error: any) {
    // eslint-disable-next-line no-console
    console.error("StepBoundary caught error in step:", this.props.stepId, error);
  }
  render() {
    if (this.state.error) {
      const msg =
        this.state.error?.message ??
        (typeof this.state.error === "string" ? this.state.error : "Unknown error");
      return (
        <div style={{ padding: 16, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            Step crashed: {this.props.stepId}
          </div>
          <div style={{ whiteSpace: "pre-wrap", opacity: 0.9 }}>{String(msg)}</div>
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => window.location.reload()}>Reload</button>
            <a href="/debug">Open /debug</a>
            <a href="/status">Open /status</a>
          </div>
        </div>
      );
    }
    return <>{this.props.children}</>;
  }
}

export default function OwnerAllianceOpsFlowPage() {
  const [sp, setSp] = useSearchParams();

  const stepParam = (sp.get("step") || "").toLowerCase();
  const step = (STEPS.find(s => s.id === stepParam)?.id ?? STEPS[0].id) as StepDef["id"];
  const active = STEPS.find(s => s.id === step)!;

  useEffect(() => {
    const cur = (sp.get("step") || "").toLowerCase();
    const ok = STEPS.some(s => s.id === cur);
    if (!ok) setSp({ step: STEPS[0].id }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <RequireAdmin>
      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
        <aside style={{ width: 260, padding: 16, borderRight: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Alliance Ops</div>
          <div style={{ opacity: 0.65, fontSize: 12, marginBottom: 12 }}>
            step={step} • build={BUILD_STAMP}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {STEPS.map(s => {
              const isActive = s.id === active.id;
              return (
                <Link
                  key={s.id}
                  to={"/owner/alliance-ops?step=" + encodeURIComponent(s.id)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    textDecoration: "none",
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                    color: "inherit",
                  }}
                >
                  {s.title}
                </Link>
              );
            })}
          </div>

          <div style={{ marginTop: 16, opacity: 0.8, fontSize: 12 }}>
            <div><a href="/owner">Owner Home</a></div>
            <div><a href="/dashboard">My Dashboards</a></div>
          </div>
        </aside>

        <main style={{ flex: 1, padding: 16 }}>
          <StepBoundary stepId={active.id}>
            {active.render()}
          </StepBoundary>
        </main>
      </div>
    </RequireAdmin>
  );
}
