import { Outlet } from "react-router-dom";
import Sidebar from "../navigation/Sidebar";

export default function MainLayout() {
  return (
    <div style={{
      display: "flex",
      width: "100vw",
      height: "100vh",
      background: "#0b0b0b",
      color: "#7cff00"
    }}>
      <Sidebar />

      <main style={{
        flex: 1,
        overflow: "auto",
        padding: 24
      }}>
        <Outlet />
      </main>
    </div>
  );
}

