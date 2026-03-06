import React from "react";
import OpsFeedPanel from "./OpsFeedPanel";

export default function IntelRail(props: { stateCode?: string }) {
  const stateCode = String(props.stateCode || "789");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 14,
        padding: 12
      }}>
        <div style={{ fontWeight: 950, fontSize: 13 }}>Intel Rail</div>
        <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>
          Fast jumps + live ops. (RLS enforced.)
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <button className="zombie-btn" type="button" onClick={() => window.location.assign("/dashboard")}>Dashboard</button>
          <button className="zombie-btn" type="button" onClick={() => window.location.assign(`/state/${stateCode}`)}>State {stateCode}</button>
          <button className="zombie-btn" type="button" onClick={() => window.location.assign(`/state/${stateCode}/threads`)}>Threads</button>
          <button className="zombie-btn" type="button" onClick={() => window.location.assign(`/state/${stateCode}/achievements`)}>Dossier</button>
          <button className="zombie-btn" type="button" onClick={() => window.location.assign("/owner/ops")}>Ops</button>
        </div>
      </div>

      <OpsFeedPanel stateCode={stateCode} limit={10} />
    </div>
  );
}
