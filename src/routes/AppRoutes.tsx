import { Routes, Route } from 'react-router-dom';
import Login from '../pages/Login';
import AllianceDashboard from '../pages/AllianceDashboard';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<AllianceDashboard />} />
    </Routes>
  );
}
