import { Outlet, NavLink, useParams } from "react-router-dom";
import LogoutButton from "../components/LogoutButton";
import "../styles/dashboard-zombie.css";

export default function DashboardLayout() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const base = alliance_id ? `/dashboard/${alliance_id}` : "";

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <h2 className="sidebar-title">🧟 {alliance_id?.toUpperCase()}</h2>

        <nav className="sidebar-nav">
          <NavLink to={base}>Command Center</NavLink>
          <NavLink to={`${base}/hq-map`}>HQ Map</NavLink>
          <NavLink to={`${base}/events`}>Events</NavLink>
        </nav>

        <LogoutButton />
      </aside>

      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  );
}
