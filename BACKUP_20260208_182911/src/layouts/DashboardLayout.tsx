import { Outlet, NavLink, useParams } from "react-router-dom";

export default function DashboardLayout() {
  const { allianceId } = useParams<{ allianceId: string }>();
  const base = allianceId ? `/dashboard/${allianceId}` : "";

  return (
    <div className="dashboard-container">
      <aside className="dashboard-sidebar">
        <h2 className="sidebar-title">🧟 {allianceId?.toUpperCase()}</h2>

        <nav className="sidebar-nav">
          <div className="sidebar-section">
            <h4>🧠 Alliance</h4>
            <NavLink to={base}>Command Center</NavLink>
            <NavLink to={`${base}/hq-map`}>HQ Map</NavLink>
            <NavLink to={`${base}/events`}>Events</NavLink>
            <NavLink to={`${base}/event-templates`}>Event Templates</NavLink>
          </div>

          <div className="sidebar-section">
            <h4>📡 State</h4>
            <NavLink to="/state/1">State Dashboard</NavLink>
          </div>

          <div className="sidebar-section">
            <h4>👑 Overseer</h4>
            <NavLink to="/owner">Overseer Dashboard</NavLink>
            <NavLink to="/owner/approvals">Approvals</NavLink>
            <NavLink to="/owner/control">Control Panel</NavLink>
          </div>
        </nav>
      </aside>

      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
}
