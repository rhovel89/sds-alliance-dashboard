import { Routes, Route } from 'react-router-dom';

import DashboardLayout from '../layouts/DashboardLayout';
import RequireAlliance from '../components/RequireAlliance';

import LandingPage from '../pages/LandingPage';
import AuthCallback from '../pages/AuthCallback';
import Onboarding from '../pages/Onboarding';
import PendingApproval from '../pages/PendingApproval';

import StateDashboard from '../pages/state/StateDashboard';

import MyAlliance from '../pages/MyAlliance';
import HQMap from '../pages/HQMap';
import EventsPage from '../pages/EventsPage';
import EventTemplates from '../pages/EventTemplates';

import OwnerDashboard from '../pages/OwnerDashboard';
import OwnerApprovals from '../pages/OwnerApprovals';
import OwnerControlPanel from '../pages/OwnerControlPanel';

import NotFound from '../pages/NotFound';

export default function AppRoutes() {
  return (
    <Routes>

      <Route path='/' element={<LandingPage />} />
      <Route path='/auth/callback' element={<AuthCallback />} />

      <Route path='/onboarding' element={<Onboarding />} />
      <Route path='/pending-approval' element={<PendingApproval />} />

      <Route path='/state/:stateId' element={<StateDashboard />} />

      <Route path='/owner' element={<OwnerDashboard />} />
      <Route path='/owner/approvals' element={<OwnerApprovals />} />
      <Route path='/owner/control' element={<OwnerControlPanel />} />

      <Route
        path='/dashboard/:allianceId/*'
        element={
          <RequireAlliance>
            <DashboardLayout />
          </RequireAlliance>
        }
      >
        <Route index element={<MyAlliance />} />
        <Route path='hq-map' element={<HQMap />} />
        <Route path='events' element={<EventsPage />} />
        <Route path='event-templates' element={<EventTemplates />} />
      </Route>

      <Route path='*' element={<NotFound />} />

    </Routes>
  );
}


