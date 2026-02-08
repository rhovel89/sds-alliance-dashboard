import { Routes, Route } from 'react-router-dom';

import DashboardLayout from '../layouts/DashboardLayout';
import StateDashboard from '../pages/StateDashboard';
import OwnerApprovals from '../pages/OwnerApprovals';
import OwnerControlPanel from '../pages/OwnerControlPanel';
import Onboarding from '../pages/Onboarding';
import PendingApproval from '../pages/PendingApproval';
import AuthCallback from '../pages/AuthCallback';
import LandingPage from '../pages/LandingPage';
import NotFound from '../pages/NotFound';

export default function AppRoutes() {
  return (
    <Routes>

      {/* LANDING / AUTH */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* ONBOARDING */}
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/pending-approval" element={<PendingApproval />} />

      {/* STATE DASHBOARD (ROOT LEVEL — REQUIRED) */}
      <Route path="/state/:stateId" element={<StateDashboard />} />

      {/* ALLIANCE DASHBOARD */}
      <Route path="/dashboard/:allianceId/*" element={<DashboardLayout />} />

      {/* OWNER */}
      <Route path="/owner/approvals" element={<OwnerApprovals />} />
      <Route path="/owner/control" element={<OwnerControlPanel />} />

      {/* FALLBACK */}
      <Route path="*" element={<NotFound />} />

    </Routes>
  );
}
