import { Routes, Route } from "react-router-dom";
import AppLayout from "./layout/AppLayout";
import AuthLayout from "./layout/AuthLayout";

/* VERIFIED PAGES */
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import PendingApproval from "./pages/PendingApproval";
import AllianceDashboard from "./pages/AllianceDashboard";
import HQMap from "./pages/HQMap";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Routes>

      {/* PUBLIC */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<LandingPage />} />
      </Route>

      {/* AUTH FLOW */}
      <Route element={<AppLayout />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/pending" element={<PendingApproval />} />
        </Route>

        {/* APP */}
        <Route path="/app" element={<AllianceDashboard />} />
        <Route path="/dashboard/hq-map" element={<HQMap />} />
        <Route path="*" element={<NotFound />} />
      </Route>

    </Routes>
  );
}
