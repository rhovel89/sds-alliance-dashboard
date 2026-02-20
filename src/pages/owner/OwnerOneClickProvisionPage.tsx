import React from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";

export default function OwnerOneClickProvisionPage() {
  return (
    <div style={{ padding: 14 }}>
      <div className="zombie-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>✅ Owner — One-click Approve + Provision</div>
          <SupportBundleButton />
        </div>
        <div style={{ marginTop: 10, opacity: 0.75 }}>
          Placeholder page created to fix build. We will wire the real approve+provision flow next.
        </div>
      </div>
    </div>
  );
}
