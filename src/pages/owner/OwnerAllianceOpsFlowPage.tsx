import React, { Suspense, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

type Step = {
  key: string;
  title: string;
  desc: string;
  path: string;
  candidates?: string[]; // filenames (without .tsx) to try embedding
};

const modules = import.meta.glob("../../pages/**/*.tsx");

function pickModuleByCandidates(cands?: string[]) {
  if (!cands || cands.length === 0) return null;

  const keys = Object.keys(modules);
  for (const name of cands) {
    const hit = keys.find((k) => k.endsWith(`/${name}.tsx`));
    if (hit) return modules[hit] as any;
  }
  return null;
}

function StepEmbed(props: { step: Step }) {
  const mod = pickModuleByCandidates(props.step.candidates);
  if (!mod) {
    return (
      <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12 }}>
        <div style={{ fontWeight: 900, color: "rgba(245,245,245,0.98)" }}>Open this step</div>
        <div style={{ opacity: 0.85, marginTop: 6 }}>
          (This step page couldn't be auto-embedded by filename lookup.)
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href={props.step.path} style={{ textDecoration: "none" }}>
            <button type="button" style={{ padding: "10px 12px", borderRadius: 12 }}>Open Step</button>
          </a>
          <a href={props.step.path} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
            <button type="button" style={{ padding: "10px 12px", borderRadius: 12 }}>Open Fullscreen</button>
          </a>
        </div>
      </div>
    );
  }

  const Lazy = React.lazy(mod);

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 12,
        background: "rgba(0,0,0,0.25)",
        maxHeight: "70vh",
        overflow: "auto",
      }}>
        <Suspense fallback={<div style={{ padding: 14, opacity: 0.85 }}>Loading step…</div>}>
          <div style={{ padding: 10 }}>
            <Lazy />
          </div>
        </Suspense>
      </div>

      <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>
        If the embedded view feels tight, use <b>Open Step Fullscreen</b>.
      </div>
    </div>
  );
}

export default function OwnerAllianceOpsFlowPage() {
  const [sp, setSp] = useSearchParams();

  const steps: Step[] = useMemo(() => ([
    {
      key: "directory",
      title: "1. Alliance Directory",
      desc: "Add / edit alliance codes & names.",
      path: "/owner/directory-editor",
      candidates: [
        "OwnerAllianceDirectoryEditorPage",
        "OwnerDirectoryEditorPage",
        "OwnerDirectoryEditor",
        "OwnerAllianceDirectoryPage",
        "OwnerDirectoryPage",
      ],
    },
    {
      key: "sync",
      title: "2. Directory Sync",
      desc: "Sync directory → DB mappings.",
      path: "/owner/directory-sync",
      candidates: [
        "OwnerAllianceDirectorySyncPage",
        "OwnerDirectorySyncPage",
        "OwnerDirectorySync",
      ],
    },
    {
      key: "alliances",
      title: "3. Alliances",
      desc: "Create / edit alliances stored in Supabase.",
      path: "/owner/alliances",
      candidates: [
        "OwnerAlliancesPage",
        "OwnerAlliancesDbPage",
        "OwnerAllianceDirectoryDbPage",
        "AllianceDirectoryDbPage",
      ],
    },
    {
      key: "memberships",
      title: "4. Memberships",
      desc: "See who is in which alliance.",
      path: "/owner/memberships",
      candidates: [
        "OwnerMembershipsPage",
        "OwnerMemberships",
      ],
    },
    {
      key: "permissions",
      title: "5. Permissions",
      desc: "Permissions that affect alliances too.",
      path: "/owner/permissions-matrix-v3",
      candidates: [
        "OwnerPermissionsMatrixV3Page",
        "OwnerPermissionsMatrixV3",
        "OwnerAccessControlPage",
        "OwnerPermissionsDbPage",
      ],
    },
  ]), []);

  const stepKey = sp.get("step") || steps[0].key;
  const active = steps.find((s) => s.key === stepKey) || steps[0];
  const activeIndex = steps.findIndex((s) => s.key === active.key);

  const go = (idx: number) => {
    const s = steps[Math.max(0, Math.min(steps.length - 1, idx))];
    setSp({ step: s.key });
  };

  const shellStyle: React.CSSProperties = { padding: 16, maxWidth: 1400, margin: "0 auto" };

  const cardStyle: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.16)",
    borderRadius: 14,
    background: "rgba(0,0,0,0.45)",
    boxShadow: "0 10px 40px rgba(0,0,0,0.45)",
  };

  const stepBtnBase: React.CSSProperties = {
    width: "100%",
    textAlign: "left",
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    cursor: "pointer",
    color: "rgba(245,245,245,0.96)",
  };

  const selectedStyle: React.CSSProperties = {
    border: "1px solid rgba(120,255,120,0.55)",
    background: "rgba(40,160,60,0.18)",
    boxShadow: "0 0 0 2px rgba(120,255,120,0.20) inset",
  };

  return (
    <div style={shellStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: "rgba(240,255,240,0.98)", textShadow: "0 0 18px rgba(0,0,0,0.65)" }}>
            Alliance Ops Flow
          </h1>
          <div style={{ marginTop: 6, opacity: 0.9, fontSize: 14, color: "rgba(235,255,235,0.92)" }}>
            One flow: Directory → Sync → Alliances → Memberships → Permissions.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href="/owner" style={{ textDecoration: "none" }}>
            <button type="button" style={{ padding: "10px 12px", borderRadius: 12 }}>← Owner Home</button>
          </a>
          <a href={active.path} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
            <button type="button" style={{ padding: "10px 12px", borderRadius: 12 }}>Open Step Fullscreen</button>
          </a>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14, marginTop: 14, alignItems: "start" }}>
        <div style={{ ...cardStyle, padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 10, color: "rgba(245,245,245,0.98)" }}>Flow Steps</div>

          <div style={{ display: "grid", gap: 10 }}>
            {steps.map((s) => {
              const selected = s.key === active.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSp({ step: s.key })}
                  style={{ ...stepBtnBase, ...(selected ? selectedStyle : null) }}
                >
                  <div style={{ fontWeight: 900, fontSize: 14, color: "rgba(250,250,250,0.98)" }}>{s.title}</div>
                  <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.3, color: "rgba(230,230,230,0.90)" }}>{s.desc}</div>
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 12 }}>
            <button type="button" onClick={() => go(activeIndex - 1)} disabled={activeIndex <= 0}>← Prev</button>
            <button type="button" onClick={() => go(activeIndex + 1)} disabled={activeIndex >= steps.length - 1}>Next →</button>
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 12, minHeight: 520 }}>
          <div style={{ fontWeight: 900, fontSize: 18, color: "rgba(245,245,245,0.98)" }}>{active.title.replace(/^\d+\.\s*/, "")}</div>
          <div style={{ opacity: 0.9, marginTop: 6, color: "rgba(235,235,235,0.92)" }}>{active.desc}</div>
          <StepEmbed step={active} />
        </div>
      </div>
    </div>
  );
}
