import { useMemo } from "react";
import { useParams } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import PlayerDashboardPage from "./PlayerDashboardPage";

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

export default function DashboardGate() {
  const params = useParams();
  const raw = (params as any)?.alliance_id ?? (params as any)?.code ?? "";
  const code = useMemo(() => upper(raw), [raw]);

  // If someone visits /dashboard/me (lowercase) or /dashboard/ME, send them to ME dashboard
  if (code === "ME") return <PlayerDashboardPage />;

  // Otherwise render normal alliance dashboard layout (children render via <Outlet/> in DashboardLayout)
  return <DashboardLayout />;
}
