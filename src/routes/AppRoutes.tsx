import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "../pages/LandingPage";
import AllianceDashboard from "../pages/AllianceDashboard";
import LoginTransition from "../components/LoginTransition";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route
        path="/dashboard"
        element={
          <LoginTransition>
            <AllianceDashboard />
          </LoginTransition>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
