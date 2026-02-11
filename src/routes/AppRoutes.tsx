import { Routes, Route } from "react-router-dom";

import Login from "../pages/Login";
import AuthCallback from "../pages/AuthCallback";

import DashboardLayout from "../layouts/DashboardLayout";
import RequireAlliance from "../components/RequireAlliance";

import MyAlliance from "../pages/MyAlliance";
import EventsPage from "../pages/EventsPage";
import StateDashboard from "../pages/StateDashboard";

import OwnerDashboard from "../pages/OwnerDashboard";
import OwnerDashboardSelect from "../pages/OwnerDashboardSelect";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<AuthCallback />} />

      {/* OWNER */}
      <Route path="/owner" element={<OwnerDashboard />} />
      <Route path="/owner/select" element={<OwnerDashboardSelect />} />

      {/* ALLIANCE DASHBOARD */}
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
          path="events"
          element={
            <RequireAlliance>
              <EventsPage />
            </RequireAlliance>
          }
        />
      </Route>

      {/* STATE */}
      <Route path="/state/1" element={<StateDashboard />} />
    </Routes>
  );
}
