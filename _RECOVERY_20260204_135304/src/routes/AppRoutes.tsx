// src/routes/AppRoutes.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { useSession } from "../hooks/useSession";

import LandingPage from "../pages/LandingPage";
import Login from "../pages/Login";
import AllianceDashboard from "../pages/AllianceDashboard";
import HQMap from "../pages/HQMap";

function FullscreenLoader() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div>Loading…</div>
    </div>
  );
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const { loading, session } = useSession();
  if (loading) return <FullscreenLoader />;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function RedirectIfAuthed({ children }: { children: JSX.Element }) {
  const { loading, session } = useSession();
  if (loading) return <FullscreenLoader />;
  if (session) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <RedirectIfAuthed>
            <LandingPage />
          </RedirectIfAuthed>
        }
      />

      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <Login />
          </RedirectIfAuthed>
        }
      />

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <AllianceDashboard />
          </RequireAuth>
        }
      />

      <Route
        path="/hq-map"
        element={
          <RequireAuth>
            <HQMap />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
