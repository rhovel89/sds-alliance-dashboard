import { Routes, Route , useParams} from "react-router-dom";
import PlayerProfilePage from "../pages/PlayerProfilePage";

import LandingPage from "../pages/LandingPage";
import Login from "../pages/Login";
import AuthCallback from "../pages/AuthCallback";
import Onboarding from "../pages/Onboarding";
import PendingApproval from "../pages/PendingApproval";

import DashboardLayout from "../layouts/DashboardLayout";
import RequireAlliance from "../components/RequireAlliance";

import MyAlliance from "../pages/MyAlliance";
import HQMap from "../pages/HQMap";
import EventsPage from "../pages/EventsPage";
import EventTemplates from "../pages/EventTemplates";

import OwnerDashboard from "../pages/OwnerDashboard";
import OwnerApprovals from "../pages/OwnerApprovals";
import OwnerControlPanel from "../pages/OwnerControlPanel";

import StateDashboard from "../pages/state/StateDashboard";
import NotFound from "../pages/NotFound";

export default function AppRoutes() {
  const { allianceId } = useParams<{ allianceId: string }>();
  return (
    <Routes>

      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Onboarding */}
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/pending-approval" element={<PendingApproval />} />

      {/* Alliance Dashboard */}
      

      {/* State */}
            <Route
        path="/dashboard/:allianceId"
        element={
          <RequireAlliance>
            <DashboardLayout />
          </RequireAlliance>
        }
      >
        <Route index element={<MyAlliance />} />
        <Route path="profile" element={<PlayerProfilePage />} />
      </Route>
<Route path="/state/1" element={<StateDashboard />} />

      {/* Owner */}
      <Route path="/owner" element={<OwnerDashboard />} />
      <Route path="/owner/approvals" element={<OwnerApprovals />} />
      <Route path="/owner/control" element={<OwnerControlPanel />} />

      {/* Fallback */}
      <Route path="*" element={<NotFound />} />

    </Routes>
  );
}