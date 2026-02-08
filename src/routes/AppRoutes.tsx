import { Routes, Route , Navigate } from "react-router-dom";
import LandingPage from "../pages/LandingPage";
import AuthCallback from "../pages/AuthCallback";
import AllianceDashboard from "../pages/AllianceDashboard";
import HQMap from "../pages/HQMap";
import EventsPage from "../pages/EventsPage";
import AuthGate from "../components/AuthGate";
import DashboardLayout from "../layouts/DashboardLayout";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route element={<AuthGate />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<AllianceDashboard />} />
          <Route path="/dashboard/events" element={<EventsPage />} />
          <Route path="/dashboard/hq-map" element={<HQMap />} />
        </Route>
      </Route>

      <Route path="/hq-map" element={<Navigate to="/dashboard/hq-map" replace />} />
<Route path="*" element={<div style={{ padding: 40 }}>Not Found</div>} />
    </Routes>
  );
}

