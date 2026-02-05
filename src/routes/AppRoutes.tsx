import { Routes, Route, Navigate } from "react-router-dom";
import { useSession } from "../hooks/useSession";
import LoginTransition from "../components/LoginTransition";
import LandingPage from "../pages/LandingPage";
import AllianceDashboard from "../pages/AllianceDashboard";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { session, loading } = useSession();

  if (loading) return <div>Checking access…</div>;
  if (!session) return <Navigate to="/" replace />;

  return children;
}

export default function AppRoutes() {
  const { session } = useSession();

  return (
    <Routes>
      {/* ROOT */}
      <Route
        path="/"
        element={session ? <Navigate to="/dashboard" replace /> : <LandingPage />}
      />

      {/* DASHBOARD */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <LoginTransition>
              <AllianceDashboard />
            </LoginTransition>
          </RequireAuth>
        }
      />

      {/* SAFETY */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
