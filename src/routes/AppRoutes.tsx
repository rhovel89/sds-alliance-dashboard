import { Routes, Route } from "react-router-dom";

import Login from "../pages/Login";
import AuthCallback from "../pages/AuthCallback";

import DashboardLayout from "../layouts/DashboardLayout";
import RequireAlliance from "../components/RequireAlliance";

import MyAlliance from "../pages/MyAlliance";
import EventsPage from "../pages/EventsPage";
import Permissions from "../pages/Permissions";
import AllianceHQMap from "../pages/dashboard/AllianceHQMap";

import OwnerDashboardSelect from "../pages/OwnerDashboardSelect";
import OwnerDashboard from "../pages/OwnerDashboard";
import StateDashboard from "../pages/StateDashboard";

export default function AppRoutes() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<AuthCallback />} />

      {/* OWNER */}
      <Route path="/owner/select" element={<OwnerDashboardSelect />} />
      <Route path="/owner" element={<OwnerDashboard />} />

      {/* STATE */}
      <Route path="/state/1" element={<StateDashboard />} />

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
              <Permissions />
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
    </Routes>
  );
}
