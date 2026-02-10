import { Outlet, useParams, Link } from "react-router-dom";
import LogoutButton from "../components/LogoutButton";
import "../styles/dashboard-zombie.css";

export default function DashboardLayout() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const base = `/dashboard/${alliance_id}`;

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <h2 className="sidebar-title">🧟 {alliance_id?.toUpperCase()}</h2>

        <nav className="sidebar-nav">
          <Link to={base}>Command Center</Link>
          <Link to={`${base}/hq-map`}>HQ Map</Link>
          <Link to={`${base}/events`}>Events</Link>
        </nav>

        <LogoutButton />
      </aside>

      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  );
}
