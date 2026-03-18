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
        <div style={{ display: "flex", gap: 18, alignItems: "stretch", flexWrap: "wrap", minWidth: 0 }}>
          <aside data-sad-sidebar="1" style={{ width: "100%", maxWidth: 240, minWidth: 0, flex: "1 1 240px" }}>
            <div className="zombie-card" style={{ padding: 12 }}>
              <AllianceSidebarTabs allianceCode={String(alliance_id || "")} />
            </div>
          </aside>

          <main data-sad-main="1" className="dashboard-main" style={{ flex: 1 }}>
            <Outlet />
          </main>
        </div>
      ) : (
        <main data-sad-main="1" className="dashboard-main">
          <Outlet />
        </main>
      )}
    </div>
  );
}

