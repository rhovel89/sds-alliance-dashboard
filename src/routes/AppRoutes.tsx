import { Routes, Route } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import RequireAlliance from "../components/RequireAlliance";
import LogoutButton from "../components/LogoutButton";

import MyAlliance from "../pages/MyAlliance";
import HQMap from "../pages/HQMap";
import EventsPage from "../pages/EventsPage";
import StateDashboard from "../pages/StateDashboard";
import OwnerDashboard from "../pages/OwnerDashboard";

export default function AppRoutes() {
  return (
    <>
      <LogoutButton />

      <Routes>
        <Route element={<DashboardLayout />}>
          <Route
            path="/dashboard/:alliance_id"
            element={
              <RequireAlliance>
                <MyAlliance />
              </RequireAlliance>
            }
          />

          <Route
            path="/dashboard/:alliance_id/hq-map"
            element={
              <RequireAlliance>
                <HQMap />
              </RequireAlliance>
            }
          />

          <Route
            path="/dashboard/:alliance_id/events"
            element={
              <RequireAlliance>
                <EventsPage />
              </RequireAlliance>
            }
          />
        </Route>

        <Route path="/state/1" element={<StateDashboard />} />
        <Route path="/owner" element={<OwnerDashboard />} />
      </Routes>
    </>
  );
}