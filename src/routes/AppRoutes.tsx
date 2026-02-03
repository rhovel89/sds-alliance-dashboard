import { Routes, Route, Navigate } from 'react-router-dom';

import LandingPage from '../pages/LandingPage';
import AllianceDashboard from '../pages/AllianceDashboard';
import AllianceRoster from '../pages/AllianceRoster';
import OwnerPermissions from '../pages/OwnerPermissions';
import AllianceInvites from '../pages/AllianceInvites';
import AllianceSettings from '../pages/AllianceSettings';
import HQMap from '../pages/hq/HQMap';
import InviteAccept from '../pages/InviteAccept';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path='/' element={<LandingPage />} />

      <Route path='/dashboard' element={<AllianceDashboard />} />
      <Route path='/dashboard/roster' element={<AllianceRoster />} />
      <Route path='/dashboard/invites' element={<AllianceInvites />} />
      <Route path='/dashboard/settings' element={<AllianceSettings />} />
      <Route path='/dashboard/hq-map' element={<HQMap />} />

      <Route path='/alliance/:allianceId/permissions' element={<OwnerPermissions />} />
      <Route path='/invite/:token' element={<InviteAccept />} />

      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  );
}
