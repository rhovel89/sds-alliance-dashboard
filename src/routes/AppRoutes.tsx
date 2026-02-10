import { Routes, Route } from "react-router-dom";

import Login from "../pages/Login";
import AuthCallback from "../pages/AuthCallback";

import DashboardLayout from "../layouts/DashboardLayout";
import RequireAlliance from "../components/RequireAlliance";

import MyAlliance from "../pages/MyAlliance";
import EventsPage from "../pages/EventsPage";
import AllianceHQMap from "../pages/dashboard/AllianceHQMap";

import StateDashboard from "../pages/StateDashboard";
import OwnerDashboard from "../pages/OwnerDashboard";
import OwnerDashboardSelect from "../pages/OwnerDashboardSelect";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<AuthCallback />} />

      {/* Alliance Dashboard Layout */}
      <Route path="/dashboard/:alliance_id" element={<DashboardLayout />}>
        <Route element={<RequireAlliance />}>
          <Route index element={<MyAlliance />} />
          <Route path="hq-map" element={<AllianceHQMap />} />
          <Route path="events" element={<EventsPage />} />
        </Route>
      </Route>

      {/* Owner / State */}
      <Route path="/state/1" element={<StateDashboard />} />
      <Route path="/owner" element={<OwnerDashboard />} />
      <Route path="/owner/select" element={<OwnerDashboardSelect />} />
    </Routes>
  );
}
