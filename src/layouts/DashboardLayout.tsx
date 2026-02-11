import { Outlet, useParams } from "react-router-dom";
import Sidebar from "../navigation/Sidebar";
import "../styles/dashboard-zombie.css";

export default function DashboardLayout() {
  const { alliance_id } = useParams<{ alliance_id: string }>();

  return (
    <div className="dashboard-shell">
      <Sidebar />

      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
}
