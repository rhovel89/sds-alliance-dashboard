import Sidebar from "../navigation/Sidebar";
import { Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #0b1300, #000)",
        color: "#d8ffd8",
      }}
    >
      <Sidebar />

      <main
        style={{
          flex: 1,
          padding: 24,
          overflowY: "auto",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
