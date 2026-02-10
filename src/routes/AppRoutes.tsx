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
import AllianceHQMap from "../pages/dashboard/AllianceHQMap";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<AuthCallback />} />

      {/* Owner */}
      <Route path="/owner/select" element={<OwnerDashboardSelect />} />
      <Route path="/owner" element={<OwnerDashboard />} />

      {/* State */}
      <Route path="/state/1" element={<StateDashboard />} />

      {/* Alliance Dashboard */}
      <Route path="/dashboard/:alliance_id" element={<DashboardLayout />}>
        <Route element={<RequireAlliance />}>
          <Route index element={<MyAlliance />} />
          <Route path="hq-map" element={<AllianceHQMap />} />
          <Route path="events" element={<EventsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
