import { Routes, Route } from "react-router-dom";

import RequireAlliance from "./RequireAlliance";

import DashboardLayout from "../layouts/DashboardLayout";

import MyAlliance from "../pages/MyAlliance";
import EventsPage from "../pages/EventsPage";
import AllianceHQMap from "../pages/hq/HQMap";

import StateDashboard from "../pages/StateDashboard";
import OwnerDashboardSelect from "../pages/OwnerDashboardSelect";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<StateDashboard />} />

      <Route path="/owner/select" element={<OwnerDashboardSelect />} />

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
