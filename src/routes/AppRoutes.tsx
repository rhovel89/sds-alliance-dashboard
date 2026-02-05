import { Routes, Route, Navigate } from "react-router-dom";
import { useSession } from "../hooks/useSession";

import LandingPage from "../pages/LandingPage";
import AuthCallback from "../pages/AuthCallback";
import AllianceDashboard from "../pages/AllianceDashboard";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { session, loading } = useSession();

  if (loading) return <div>Loading session…</div>;
  if (!session) return <Navigate to="/" replace />;

  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <AllianceDashboard />
          </RequireAuth>
        }
      />

      {/* HARD STOP — no auto redirect loops */}
      <Route path="*" element={<div>Fallback Route</div>} />
    </Routes>
  );
}
