import { Routes, Route } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import RequireAlliance from "../components/RequireAlliance";

import Login from "../pages/Login";
import AuthCallback from "../pages/AuthCallback";

import MyAlliance from "../pages/MyAlliance";
import EventsPage from "../pages/EventsPage";
import StateDashboard from "../pages/StateDashboard";

import OwnerDashboardSelect from "../pages/OwnerDashboardSelect";
import AllianceHQMap from "../pages/dashboard/AllianceHQMap";
import Permissions from "../pages/dashboard/Permissions";

export default function AppRoutes() {
  return (
    <Routes>

      {/* Public */}
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<AuthCallback />} />

      {/* Owner */}
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

      {/* State */}
      <Route path="/state/1" element={<StateDashboard />} />

    </Routes>
  );
}
