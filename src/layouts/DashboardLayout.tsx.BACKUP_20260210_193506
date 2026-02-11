import { Outlet, NavLink, useParams } from "react-router-dom";
import "../styles/dashboard-zombie.css";

export default function DashboardLayout() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const base = alliance_id ? `/dashboard/${alliance_id}` : "";

  return (
    <div className="dashboard-shell">
      <div className="zombie-blood-drip"></div>

      <aside className="dashboard-sidebar zombie-animated zombie-sidebar">
        <h2 className="sidebar-title zombie-glow">
          🧟 {alliance_id?.toUpperCase()}
        </h2>

        <nav className="sidebar-nav">
          <NavLink to={base}>My Alliance</NavLink>
          <NavLink to={`${base}/hq-map`}>HQ Layout</NavLink>
          <NavLink to={`${base}/events`}>Events</NavLink>
        </nav>
      </aside>

      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
}
