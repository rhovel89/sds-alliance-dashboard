import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export type FlowStep = {
  key: string;
  title: string;
  desc: string;
  element: React.ReactNode;
  openRoute?: string;
};

export default function OwnerFlowShell(props: { title: string; subtitle?: string; steps: FlowStep[] }) {
  const nav = useNavigate();
  const loc = useLocation();

  const stepFromQuery = useMemo(() => {
    const qs = new URLSearchParams(loc.search);
    return (qs.get("step") || "").toLowerCase().trim();
  }, [loc.search]);

  const idxFromQuery = useMemo(() => {
    if (!stepFromQuery) return -1;
    return props.steps.findIndex((s) => s.key.toLowerCase() === stepFromQuery);
  }, [props.steps, stepFromQuery]);

  const [idx, setIdx] = useState<number>(idxFromQuery >= 0 ? idxFromQuery : 0);

  useEffect(() => {
    if (idxFromQuery >= 0) setIdx(idxFromQuery);
  }, [idxFromQuery]);

  const step = props.steps[idx] || props.steps[0];

  return (
    <div style={{ padding: 16, maxWidth: 1500, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 1000 }}>{props.title}</h1>
          {props.subtitle ? <div style={{ opacity: 0.85, marginTop: 6 }}>{props.subtitle}</div> : null}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => nav("/owner")} style={{ padding: "10px 12px", borderRadius: 12 }}>
            ← Owner Home
          </button>
          {step?.openRoute ? (
            <button type="button" onClick={() => nav(step.openRoute!)} style={{ padding: "10px 12px", borderRadius: 12 }}>
              Open Step Fullscreen
            </button>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "340px 1fr", gap: 12, alignItems: "start" }}>
        <div style={{ border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14, padding: 12, background: "rgba(0,0,0,0.35)" }}>
          <div style={{ fontWeight: 950, marginBottom: 10 }}>Flow Steps</div>
          <div style={{ display: "grid", gap: 8 }}>
            {props.steps.map((s, i) => {
              const active = i === idx;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setIdx(i)}
                  style={{
                    textAlign: "left",
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: active ? "rgba(120,255,120,0.10)" : "rgba(0,0,0,0.25)",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 900 }}>{i + 1}. {s.title}</div>
                  <div style={{ opacity: 0.8, fontSize: 12, marginTop: 4 }}>{s.desc}</div>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" disabled={idx <= 0} onClick={() => setIdx((x) => Math.max(0, x - 1))}>← Prev</button>
            <button type="button" disabled={idx >= props.steps.length - 1} onClick={() => setIdx((x) => Math.min(props.steps.length - 1, x + 1))}>Next →</button>
          </div>
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14, padding: 12, background: "rgba(0,0,0,0.35)" }}>
          <div style={{ fontWeight: 950, fontSize: 16 }}>{step?.title}</div>
          <div style={{ opacity: 0.85, marginTop: 6 }}>{step?.desc}</div>
          <div style={{ marginTop: 12 }}>
            {step?.element}
          </div>
        </div>
      </div>
    </div>
  );
}
