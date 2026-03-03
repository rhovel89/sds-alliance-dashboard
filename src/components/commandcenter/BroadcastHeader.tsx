import React, { useMemo } from "react";
type ThreatLevel = "clear" | "watch" | "critical";

export default function BroadcastHeader(props: {
  stateCode: string;
  title: string;
  subtitle?: string;
  threat?: ThreatLevel;
  actions?: React.ReactNode;
}) {
  const threat = (props.threat ?? "watch") as ThreatLevel;
  const ts = useMemo(() => { try { return new Date().toLocaleString(); } catch { return ""; } }, []);

  return (
    <div className="cc-header">
      <div className="cc-header-inner">
        <div style={{ display: "grid", gap: 4 }}>
          <div className="cc-badge">
            <span className="cc-state">STATE {props.stateCode}</span>
            <span className="cc-title">EMERGENCY TRANSMISSION</span>
            <span className="cc-led" title="Realtime: LIVE" />
            <span className="cc-threat" data-level={threat}>
              <span className="cc-dot" />
              THREAT: {threat.toUpperCase()}
            </span>
          </div>
          <div style={{ fontWeight: 950, fontSize: 18 }}>{props.title}</div>
          {props.subtitle ? <div className="cc-sub">{props.subtitle}</div> : null}
        </div>

        <div className="cc-actions">
          <div style={{ opacity: 0.75, fontSize: 12, marginRight: 6 }}>{ts}</div>
          {props.actions}
        </div>
      </div>
    </div>
  );
}
