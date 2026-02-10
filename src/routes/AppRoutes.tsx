import { Routes, Route } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import RequireAlliance from "../components/RequireAlliance";

import Login from "../pages/Login";
import AuthCallback from "../pages/AuthCallback";
import MyAlliance from "../pages/MyAlliance";
import StateDashboard from "../pages/StateDashboard";
import OwnerDashboard from "../pages/OwnerDashboard";

// HQ MAP — SINGLE SOURCE OF TRUTH
import HQMap from "../pages/hq/HQMap";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<AuthCallback />} />

      {/* Alliance Dashboard */}
      <Route path="/dashboard/:alliance_id" element={<DashboardLayout />}>
        <Route
          index
          element={
            <RequireAlliance>
              <MyAlliance />
            </RequireAlliance>
          }
        />

        <Route
          path="hq-map"
          element={
            <RequireAlliance>
              <HQMap />
            </RequireAlliance>
          }
        />
      </Route>

      {/* Other */}
      <Route path="/state/1" element={<StateDashboard />} />
      <Route path="/owner" element={<OwnerDashboard />} />
    </Routes>
  );
}
