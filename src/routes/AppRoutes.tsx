import { Routes, Route } from "react-router-dom";

import Login from "../pages/Login";
import AuthCallback from "../pages/AuthCallback";
import MyAlliance from "../pages/MyAlliance";
import EventsPage from "../pages/EventsPage";
import StateDashboard from "../pages/StateDashboard";
import OwnerDashboard from "../pages/OwnerDashboard";
import OwnerDashboardSelect from "../pages/OwnerDashboardSelect";
import PermissionsPage from "../pages/Permissions";
import AllianceHQMap from "../pages/dashboard/AllianceHQMap";

import DashboardLayout from "../layouts/DashboardLayout";
import RequireAlliance from "../components/RequireAlliance";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<AuthCallback />} />

      {/* Owner */}
      <Route path="/owner" element={<OwnerDashboard />} />
      <Route path="/owner/select" element={<OwnerDashboardSelect />} />

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
              <AllianceHQMap />
            </RequireAlliance>
          }
        />

        <Route
          path="permissions"
          element={
            <RequireAlliance>
              <PermissionsPage />
            </RequireAlliance>
          }
        />

        <Route
          path="events"
          element={
            <RequireAlliance>
              <EventsPage />
            </RequireAlliance>
          }
        />
      </Route>

      {/* Other */}
      <Route path="/state/1" element={<StateDashboard />} />
    </Routes>
  );
}
