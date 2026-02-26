import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// Embed the working permissions UI you already prefer
import OwnerPermissionsMatrixV3Page from "./OwnerPermissionsMatrixV3Page";

// Keep the existing Access Control UI unchanged
import LegacyOwnerAccessControlPage from "./OwnerAccessControlPage";

function SectionCard(props: { title: string; desc?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      className="zombie-card"
      style={{
        width: "100%",
        padding: 14,
        borderRadius: 16,
        textAlign: "left",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 18, lineHeight: 1.2 }}>{props.title}</div>
          {props.desc ? <div style={{ opacity: 0.85, fontSize: 13, marginTop: 4 }}>{props.desc}</div> : null}
        </div>
        {props.right ? <div>{props.right}</div> : null}
      </div>

      <div style={{ marginTop: 12 }}>{props.children}</div>
    </div>
  );
}

export default function OwnerAccessControlHubPage() {
  const nav = useNavigate();
  const [showMatrix, setShowMatrix] = useState(true);
  const [showLegacy, setShowLegacy] = useState(true);

  return (
    <div style={{ padding: 16, maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Access Control</h2>
          <div style={{ opacity: 0.8, fontSize: 13, marginTop: 4 }}>
            This page combines your preferred Access Control UI with the full Permissions Matrix (State + Alliance).
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => nav("/owner/permissions-matrix-v3")}>Open Matrix (full page)</button>
          <button type="button" onClick={() => nav("/owner/access-control-legacy")}>Open Legacy Only</button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
        <SectionCard
          title="Permissions Matrix (V3) — State + Alliance"
          desc="This is the master permission assignment UI. Owner stays full-control. Assign helpers per-state and per-alliance."
          right={
            <button type="button" onClick={() => setShowMatrix((v) => !v)}>
              {showMatrix ? "Hide" : "Show"}
            </button>
          }
        >
          {showMatrix ? <OwnerPermissionsMatrixV3Page /> : <div style={{ opacity: 0.85 }}>Hidden.</div>}
        </SectionCard>

        <SectionCard
          title="Legacy Access Control Tools"
          desc="Your existing Access Control page — preserved and still working exactly as before."
          right={
            <button type="button" onClick={() => setShowLegacy((v) => !v)}>
              {showLegacy ? "Hide" : "Show"}
            </button>
          }
        >
          {showLegacy ? <LegacyOwnerAccessControlPage /> : <div style={{ opacity: 0.85 }}>Hidden.</div>}
        </SectionCard>
      </div>
    </div>
  );
}
