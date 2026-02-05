import { Routes, Route } from 'react-router-dom';

import LandingPage from '../pages/LandingPage';
import AuthCallback from '../pages/AuthCallback';
import Dashboard from '../pages/AllianceDashboard';
import HQMap from '../pages/HQMap';

import DashboardLayout from '../layouts/DashboardLayout';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path='/' element={<LandingPage />} />
      <Route path='/auth/callback' element={<AuthCallback />} />

      <Route element={<DashboardLayout />}>
        <Route path='/dashboard' element={<Dashboard />} />
        <Route path='/hq-map' element={<HQMap />} />
      </Route>

      <Route path='*' element={<div style={{ padding: 40 }}>Fallback Route</div>} />
    </Routes>
  );
}
