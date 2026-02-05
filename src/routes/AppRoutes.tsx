import { Routes, Route, Navigate } from "react-router-dom";
import { useSession } from "../hooks/useSession";

import LandingPage from "../pages/LandingPage";
import AuthCallback from "../pages/AuthCallback";
import AllianceDashboard from "../pages/AllianceDashboard";

import LoginTransition from "../components/LoginTransition";

export default function AppRoutes() {
  const { session, loading } = useSession();

  if (loading) {
    return <div style={{ color: "#9ca3af", padding: 20 }}>Loading…</div>;
  }

  return (
    <Routes>

      {/* PUBLIC */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LandingPage />} />

      {/* AUTH CALLBACK */}
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* PROTECTED */}
      <Route
        path="/dashboard"
        element={
          session ? (
            <LoginTransition>
              <AllianceDashboard />
            </LoginTransition>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}
