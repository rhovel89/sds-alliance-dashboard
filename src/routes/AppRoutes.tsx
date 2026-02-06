import { Routes, Route } from "react-router-dom";
import LandingPage from "../pages/LandingPage";
import AuthCallback from "../pages/AuthCallback";
import AllianceDashboard from "../pages/AllianceDashboard";
import HQMap from "../pages/HQMap";
import AuthGate from "../components/AuthGate";
import DashboardLayout from "../components/DashboardLayout";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route element={<AuthGate />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<AllianceDashboard />} />
          <Route path="/hq-map" element={<ErrorBoundary><HQMap /></ErrorBoundary>} />
        </Route>
      </Route>

      <Route path="*" element={<div style={{ padding: 40 }}>Not Found</div>} />
    </Routes>
  );
}

