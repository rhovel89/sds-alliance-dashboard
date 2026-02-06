import { Routes, Route } from "react-router-dom";
import LandingPage from "../pages/LandingPage";
import AuthCallback from "../pages/AuthCallback";
import AllianceDashboard from "../pages/AllianceDashboard";
import HQMap from "../pages/HQMap";
import EventsPage from "../pages/dashboard/EventsPage";
import AuthGate from "../components/AuthGate";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route element={<AuthGate />}>
        <Route path="/dashboard" element={<AllianceDashboard />}>
          <Route index element={<div style={{ padding: 40 }}>Dashboard Online</div>} />
          <Route path="events" element={<EventsPage />} />
          <Route path="hq-map" element={<HQMap />} />
        </Route>
      </Route>

      <Route path="*" element={<div style={{ padding: 40 }}>Not Found</div>} />
    </Routes>
  );
}
