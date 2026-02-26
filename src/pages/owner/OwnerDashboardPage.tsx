import React from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";
import OwnerCommandCenterHome from "../../components/owner/OwnerCommandCenterHome";

export default function OwnerDashboardPage() {
  return (
    <div style={{ padding: 16, maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Owner Command Center</h2>
        <SupportBundleButton />
      </div>
      <OwnerCommandCenterHome />
    </div>
  );
}
