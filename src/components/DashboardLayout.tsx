import { Outlet, Link, useLocation } from "react-router-dom";
import "../styles/dashboard-shell.css";

export default function DashboardLayout() {
  const location = useLocation();

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <h2 className="logo">🧟 SDS</h2>

        <nav>
          <Link
            to="/dashboard"
            className={location.pathname === "/dashboard" ? "active" : ""}
          >
            Dashboard
          </Link>

          <Link
            to="/hq-map"
            className={location.pathname === "/hq-map" ? "active" : ""}
          >
            HQ Map
          </Link>
        </nav>
      </aside>

      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
}
