import { lazy, Suspense } from "react";
import { Outlet, NavLink, useParams, Navigate, useLocation } from "react-router-dom";
import "../styles/dashboard-zombie.css";
import AllianceAnnouncementsPanel from "../components/announcements/AllianceAnnouncementsPanel";
import AllianceDashboardExtras from "../components/alliance/AllianceDashboardExtras";
import { GuidesQuickLink } from "../components/guides/GuidesQuickLink";
import CurrentAlliancePill from "../components/nav/CurrentAlliancePill";
const LazyAllianceQuickLinksPanel = lazy(() => import("../components/alliance/AllianceQuickLinksPanel").then((m: any) => ({ default: m.AllianceQuickLinksPanel })));

export default function DashboardLayout() {
  const { alliance_id } = useParams<{ alliance_id: string }>();

  if (!alliance_id) {
    return <div>Missing alliance.</div>;
  }

  const upper = alliance_id.toUpperCase();

  // FORCE uppercase route (fixes calendar + hq map routing)
  if (alliance_id !== upper) {
    return <Navigate to={`/dashboard/${upper}`} replace />;
  }

  const base = `/dashboard/${upper}`;

  const location = useLocation();

  const showQuickLinks = /^\/dashboard\/[^\/]+\/?$/.test(location.pathname);

  return(
      <>
      {/* --- Added: Alliance Announcements + Guides --- */}
      <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
        <AllianceDashboardExtras />
      </div>

    <div className="dashboard-shell">
      <aside className="dashboard-sidebar zombie-animated zombie-sidebar">
        <h2 className="sidebar-title zombie-glow">
          🧟 {upper}
        </h2>

        <nav className="sidebar-nav">
          <NavLink to={base}>My Alliance</NavLink>
          <NavLink to={`${base}/hq-map`}>HQ Layout</NavLink>
          <NavLink to={`${base}/calendar`}>Calendar</NavLink>
          <NavLink to={`${base}/guides`}>Guides</NavLink>
          <NavLink to={`${base}/permissions`}>Permissions</NavLink>
          <NavLink to={`${base}/events`}>Events</NavLink>
        </nav>
      </aside>

      <main className="dashboard-main">
        {showQuickLinks ? (<Suspense fallback={null}><LazyAllianceQuickLinksPanel /></Suspense>) : null}

        <Outlet />
      <GuidesQuickLink />
      </main>
    </div>
      </>
  );
}
