import { Routes, Route } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";

import Login from "../pages/Login";
import AuthCallback from "../pages/AuthCallback";
import MyAlliance from "../pages/MyAlliance";
import EventsPage from "../pages/EventsPage";
import StateDashboard from "../pages/StateDashboard";
import OwnerDashboard from "../pages/OwnerDashboard";
import OwnerDashboardSelect from "../pages/OwnerDashboardSelect";

import AllianceHQMap from "../pages/dashboard/AllianceHQMap";
import PermissionsPage from "../pages/dashboard/Permissions";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<AuthCallback />} />

      <Route path="/owner" element={<OwnerDashboard />} />
      <Route path="/owner/select" element={<OwnerDashboardSelect />} />

      <Route path="/dashboard/:alliance_id" element={<DashboardLayout />}>
        <Route index element={<MyAlliance />} />

        {/* TEMP: remove RequireAlliance for testing */}
        <Route path="hq-map" element={<AllianceHQMap />} />
        <Route path="permissions" element={<PermissionsPage />} />
        <Route path="events" element={<EventsPage />} />
      </Route>

      <Route path="/state/1" element={<StateDashboard />} />
    </Routes>
  );
}
