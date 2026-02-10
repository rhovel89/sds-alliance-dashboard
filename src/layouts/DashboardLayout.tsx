import { Outlet, useParams, Link } from "react-router-dom";
import LogoutButton from "../components/LogoutButton";

export default function DashboardLayout() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const base = alliance_id ? `/dashboard/${alliance_id}` : "";

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <nav>
          {alliance_id && (
            <>
              <Link to={`${base}`}>Home</Link>
              <Link to={`${base}/hq-map`}>HQ Map</Link>
              <Link to={`${base}/events`}>Events</Link>
            </>
          )}
        </nav>
        <LogoutButton />
      </header>

      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  );
}