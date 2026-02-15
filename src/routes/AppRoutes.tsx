import { Routes, Route } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import RequireAlliance from "../components/RequireAlliance";

import Login from "../pages/Login";
import AuthCallback from "../pages/AuthCallback";
import MyAlliance from "../pages/MyAlliance";
import EventsPage from "../pages/EventsPage";
import StateDashboard from "../pages/StateDashboard";
import OwnerDashboard from "../pages/OwnerDashboard";
import OwnerDashboardSelect from "../pages/OwnerDashboardSelect";
import OwnerDashboardPage from "../pages/owner/OwnerDashboardPage";


import AllianceHQMap from "../pages/dashboard/AllianceHQMap";
import PermissionsPage from "../pages/dashboard/Permissions";

import AllianceCalendarPage from "../pages/calendar/AllianceCalendarPage";

export default function AppRoutes() {
  return (
    <Routes>

      {/* Public */}
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<AuthCallback />} />

      {/* Owner */}
      <Route path="/owner" element={<OwnerDashboard />} />
      <Route path="/owner/select" element={<OwnerDashboardSelect />} />
      <Route path="/owner" element={<OwnerDashboardPage />} />


      {/* State */}
      <Route path="/state/1" element={<StateDashboard />} />

      {/* Alliance Dashboard */}
      <Route path="/dashboard/:alliance_id" element={<DashboardLayout />}>
        
        <Route
          index
          element={
            <MyAlliance />
          }
        />

        <Route
          path="hq-map"
          element={
            <AllianceHQMap />
          }
        />

        <Route
          path="calendar"
          element={
            <AllianceCalendarPage />
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

    </Routes>
  );
}


