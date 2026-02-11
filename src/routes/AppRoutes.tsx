import { Routes, Route } from "react-router-dom";

import Login from "../pages/Login";
import AuthCallback from "../pages/AuthCallback";

import DashboardLayout from "../layouts/DashboardLayout";
import MyAlliance from "../pages/MyAlliance";
import EventsPage from "../pages/EventsPage";

import OwnerDashboardSelect from "../pages/OwnerDashboardSelect";
import OwnerDashboard from "../pages/OwnerDashboard";

import AllianceHQMap from "../pages/dashboard/AllianceHQMap";
import Permissions from "../pages/dashboard/Permissions";

export default function AppRoutes() {
  return (
    <Routes>

      {/* PUBLIC */}
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<AuthCallback />} />

      {/* OWNER */}
      <Route path="/owner" element={<OwnerDashboard />} />
      <Route path="/owner/select" element={<OwnerDashboardSelect />} />

      {/* ALLIANCE DASHBOARD */}
      <Route path="/dashboard/:alliance_id" element={<DashboardLayout />}>
        <Route index element={<MyAlliance />} />
        <Route path="hq-map" element={<AllianceHQMap />} />
        <Route path="permissions" element={<Permissions />} />
        <Route path="events" element={<EventsPage />} />
                <Route path="permissions" element={<PermissionsPage />} />
        </Route>
      </Routes>
  );
}


