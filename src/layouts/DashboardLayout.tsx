import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function DashboardLayout() {
  return (
    <div style={{
      display: "flex",
      width: "100vw",
      height: "100vh",
      overflow: "hidden",
    }}>
      {/* SIDEBAR */}
      <div style={{
        width: "240px",
        minWidth: "240px",
        borderRight: "1px solid #0f0",
      }}>
        <Sidebar />
      </div>

      {/* MAIN CONTENT */}
      <div style={{
        flex: 1,
        position: "relative",
        overflow: "auto",
      }}>
        <Outlet />
      </div>
    </div>
  );
}
