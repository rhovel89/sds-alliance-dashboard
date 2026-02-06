import { Routes, Route } from "react-router-dom";
import LandingPage from "../pages/LandingPage";
import AuthCallback from "../pages/AuthCallback";
import AllianceDashboard from "../pages/AllianceDashboard";
import HQMap from "../pages/HQMap";
import AuthGate from "../components/AuthGate";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Authenticated */}
      <Route element={<AuthGate />}>
        <Route path="/dashboard" element={<AllianceDashboard />} />
        <Route path="/hq-map" element={<HQMap />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<div style={{ padding: 40 }}>Not Found</div>} />
    </Routes>
  );
}
