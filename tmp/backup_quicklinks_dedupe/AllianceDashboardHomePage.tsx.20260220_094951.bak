import React from "react";
import { useParams } from "react-router-dom";
import { AllianceQuickLinksPanel } from "../../components/alliance/AllianceQuickLinksPanel";
import InnerDashboardHomeImported from "../PlayerDashboardPage";
// FROM_APPROUTES: detected default dashboard home component
InnerDashboardHome = InnerDashboardHomeImported;


/**
 * This page exists ONLY to safely add non-fragile UI on the alliance dashboard home route:
 *   /dashboard/:alliance_id
 *
 * It renders Quick Links + the existing dashboard home component.
 *
 * NOTE: AppRoutes will be patched to wrap the existing element with this page.
 */

// The "InnerDashboardHome" import will be injected by AppRoutes patch if possible.
// Fallback: if the import cannot be determined, we'll render only the Quick Links.
let InnerDashboardHome: any = null;

export default function AllianceDashboardHomePage() {
  const { alliance_id } = useParams();
  const code = (alliance_id || "").toString().toUpperCase();

  return (
    <div>
      <AllianceQuickLinksPanel />
      {InnerDashboardHome ? <InnerDashboardHome key={code} /> : null}
    </div>
  );
}