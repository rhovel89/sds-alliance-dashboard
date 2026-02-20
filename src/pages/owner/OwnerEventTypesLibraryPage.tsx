import React from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";

export default function OwnerEventTypesLibraryPage() {
  return (
    <div style={{ padding: 14 }}>
      <div className="zombie-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>🎯 Owner — Event Types Library (UI-only)</div>
          <SupportBundleButton />
        </div>
        <div style={{ marginTop: 10, opacity: 0.75 }}>
          Placeholder page created to fix build (case-sensitive deploy). If you already had a richer version,
          it may exist under a different filename/case; we can merge later safely.
        </div>
      </div>
    </div>
  );
}
