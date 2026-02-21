import React from "react";
import { Outlet, useLocation, useParams } from "react-router-dom";
import AuthRedirector from "../components/auth/AuthRedirector";
import AllianceSidebarTabs from "../components/nav/AllianceSidebarTabs";

type Params = { alliance_id?: string };

export default function DashboardLayout() {
  const loc = useLocation();
  const { alliance_id } = useParams<Params>();

  const path = loc.pathname || "";
  const isAllianceArea = path.startsWith("/dashboard/") && !!alliance_id && path !== "/dashboard";

  return (
    <div className="dashboard-layout">
      <AuthRedirector />

      {isAllianceArea ? (
        <div style={{ display: "flex", gap: 18, alignItems: "stretch" }}>
          <aside style={{ width: 240, minWidth: 240 }}>
            <div className="zombie-card" style={{ padding: 12 }}>
              <AllianceSidebarTabs allianceCode={String(alliance_id || "")} />
            </div>
          </aside>

          <main className="dashboard-main" style={{ flex: 1 }}>
            <Outlet />
          </main>
        </div>
      ) : (
        <main className="dashboard-main">
          <Outlet />
        </main>
      )}
    </div>
  );
}