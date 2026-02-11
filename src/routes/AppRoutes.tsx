import { Routes, Route } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import MyAlliance from "../pages/MyAlliance";
import EventsPage from "../pages/EventsPage";
import AllianceHQMap from "../pages/dashboard/AllianceHQMap";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="dashboard/:alliance_id" element={<DashboardLayout />}>
        <Route index element={<MyAlliance />} />
        <Route path="hq-map" element={<AllianceHQMap />} />
        <Route path="events" element={<EventsPage />} />
      </Route>
    </Routes>
  );
}
