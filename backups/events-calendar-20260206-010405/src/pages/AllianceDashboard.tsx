import { Outlet } from "react-router-dom";

export default function AllianceDashboard() {
  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#e5ffe5" }}>
      <Outlet />
    </div>
  );
}
