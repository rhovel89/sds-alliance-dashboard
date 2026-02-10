import { Routes, Route } from "react-router-dom";

import Login from "../pages/Login";
import AuthCallback from "../pages/AuthCallback";
import MyAlliance from "../pages/MyAlliance";
import EventsPage from "../pages/EventsPage";

import DashboardLayout from "../layouts/DashboardLayout";
import RequireAlliance from "../components/RequireAlliance";

import AllianceHQMap from "../pages/hq/HQMap";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<AuthCallback />} />

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
