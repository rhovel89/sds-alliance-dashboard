import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

type Step = {
  key: string;
  title: string;
  desc: string;
  path: string;
};

function clampStep(steps: Step[], key: string | null) {
  if (!key) return steps[0];
  const hit = steps.find((s) => s.key === key);
  return hit || steps[0];
}

export default function OwnerAllianceOpsFlowPage() {
  const [sp, setSp] = useSearchParams();

  const steps: Step[] = useMemo(() => ([
    {
      key: "directory",
      title: "1. Alliance Directory",
      desc: "Add / edit alliance codes & names.",
      path: "/owner/directory-editor",
    },
    {
      key: "sync",
      title: "2. Directory Sync",
      desc: "Sync directory → DB mappings.",
      path: "/owner/directory-sync",
    },
    {
      key: "alliances",
      title: "3. Alliances (DB)",
      desc: "Create / edit alliances stored in Supabase.",
      path: "/owner/alliances",
    },
    {
      key: "memberships",
      title: "4. Memberships",
      desc: "See who is in which alliance.",
      path: "/owner/memberships",
    },
    {
      key: "permissions",
      title: "5. Permissions",
      desc: "Permissions that affect alliances too.",
      path: "/owner/permissions-matrix-v3",
    },
  ]), []);

  const active = clampStep(steps, sp.get("step"));
  const activeIndex = steps.findIndex((s) => s.key === active.key);

  const goStep = (idx: number) => {
    const s = steps[Math.max(0, Math.min(steps.length - 1, idx))];
    setSp({ step: s.key });
  };

  const shellStyle: React.CSSProperties = {
    padding: 16,
    maxWidth: 1400,
    margin: "0 auto",
  };

  const pageTitleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: 28,
    fontWeight: 900,
    color: "rgba(230,255,230,0.98)",
    textShadow: "0 0 18px rgba(0,0,0,0.65)",
  };

  const subtitleStyle: React.CSSProperties = {
    marginTop: 6,
    opacity: 0.9,
    fontSize: 14,
    color: "rgba(225,255,225,0.92)",
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "360px 1fr",
    gap: 14,
    marginTop: 14,
    alignItems: "start",
  };

  const cardStyle: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.16)",
    borderRadius: 14,
    background: "rgba(0,0,0,0.45)",
    boxShadow: "0 10px 40px rgba(0,0,0,0.45)",
  };

  const leftStyle: React.CSSProperties = {
    ...cardStyle,
    padding: 12,
  };

  const rightStyle: React.CSSProperties = {
    ...cardStyle,
    padding: 12,
    minHeight: 520,
  };

  const stepBtnBase: React.CSSProperties = {
    width: "100%",
    textAlign: "left",
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    cursor: "pointer",
    color: "rgba(245,245,245,0.96)",          // ✅ readable
  };

  const stepTitleStyle: React.CSSProperties = {
    fontWeight: 900,
    fontSize: 14,
    color: "rgba(250,250,250,0.98)",          // ✅ readable
  };

  const stepDescStyle: React.CSSProperties = {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 1.3,
    color: "rgba(230,230,230,0.90)",          // ✅ readable
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
          <h1 style={pageTitleStyle}>Alliance Ops Flow</h1>
          <div style={subtitleStyle}>
            One page flow: Directory → Sync → Alliances → Memberships → Permissions.
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

      <div style={gridStyle}>
        {/* LEFT */}
        <div style={leftStyle}>
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
                  <div style={stepTitleStyle}>{s.title}</div>
                  <div style={stepDescStyle}>{s.desc}</div>
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 12 }}>
            <button type="button" onClick={() => goStep(activeIndex - 1)} disabled={activeIndex <= 0}>
              ← Prev
            </button>
            <button type="button" onClick={() => goStep(activeIndex + 1)} disabled={activeIndex >= steps.length - 1}>
              Next →
            </button>
          </div>
        </div>

        {/* RIGHT */}
        <div style={rightStyle}>
          <div style={{ fontWeight: 900, fontSize: 18, color: "rgba(245,245,245,0.98)" }}>{active.title.replace(/^\d+\.\s*/, "")}</div>
          <div style={{ opacity: 0.9, marginTop: 6, color: "rgba(235,235,235,0.92)" }}>{active.desc}</div>

          {/* ✅ Always embed (no more “couldn't auto-embed”) */}
          <div style={{ marginTop: 12 }}>
            <iframe
              title={active.key}
              src={active.path}
              style={{
                width: "100%",
                height: "70vh",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 12,
                background: "rgba(0,0,0,0.25)",
              }}
            />
            <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>
              If the embedded view ever looks tight, use <b>Open Step Fullscreen</b>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
