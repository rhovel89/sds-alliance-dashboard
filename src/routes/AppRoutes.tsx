import { Routes, Route } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";

import Login from "../pages/Login";
import AuthCallback from "../pages/AuthCallback";
import MyAlliance from "../pages/MyAlliance";
import EventsPage from "../pages/EventsPage";

import AllianceHQMap from "../pages/dashboard/AllianceHQMap";
import PermissionsPage from "../pages/dashboard/Permissions";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<AuthCallback />} />

      <Route path="/dashboard/:alliance_id" element={<DashboardLayout />}>
        <Route index element={<MyAlliance />} />
        <Route path="hq-map" element={<AllianceHQMap />} />
        <Route path="permissions" element={<PermissionsPage />} />
        <Route path="events" element={<EventsPage />} />
      </Route>
    </Routes>
  );
}
