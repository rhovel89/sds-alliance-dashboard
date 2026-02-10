import { Routes, Route } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import RequireAlliance from "../components/RequireAlliance";

import Login from "../pages/Login";
import AuthCallback from "../pages/AuthCallback";

import MyAlliance from "../pages/MyAlliance";
import EventsPage from "../pages/EventsPage";
import HQMap from "../pages/hq/HQMap";

import StateDashboard from "../pages/StateDashboard";
import OwnerDashboard from "../pages/OwnerDashboard";
import OwnerDashboardSelect from "../pages/OwnerDashboardSelect";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<AuthCallback />} />

      {/* Alliance Dashboard */}
      <Route path="/dashboard/:alliance_id" element={<DashboardLayout />}>
        {/* Guard all alliance routes with RequireAlliance (it returns <Outlet />) */}
        <Route element={<RequireAlliance />}>
          <Route index element={<MyAlliance />} />
          <Route path="hq-map" element={<HQMap />} />
          <Route path="events" element={<EventsPage />} />
        </Route>
      </Route>

      {/* Owner / State */}
      <Route path="/state/1" element={<StateDashboard />} />
      <Route path="/owner" element={<OwnerDashboard />} />
      <Route path="/owner/select" element={<OwnerDashboardSelect />} />
      <Route path="/select-dashboard" element={<OwnerDashboardSelect />} />
    </Routes>
  );
}
