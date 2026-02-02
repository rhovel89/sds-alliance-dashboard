import { Routes, Route, Navigate } from "react-router-dom";
import OwnerPermissions from '../pages/OwnerPermissions';
import LandingPage from "../pages/LandingPage";
import AuthCallback from "../pages/AuthCallback";
import Onboarding from "../pages/Onboarding";
import OwnerOnboarding from "../pages/OwnerOnboarding";
import PendingApproval from "../pages/PendingApproval";
import AllianceDashboard from "../pages/AllianceDashboard";
import MyAlliance from "../pages/MyAlliance";
import HQMap from "../pages/HQMap";
import PermissionsAdmin from "../pages/PermissionsAdmin";
import MyAchievements from "../pages/MyAchievements";
import AchievementAdmin from "../pages/AchievementAdmin";
import Permissions from "../pages/Permissions";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/owner-onboarding" element={<OwnerOnboarding />} />
      <Route path="/pending" element={<PendingApproval />} />

      <Route path="/dashboard" element={<AllianceDashboard />} />
      <Route path="/my-alliance" element={<MyAlliance />} />
      <Route path="/hq-map" element={<HQMap />} />

      <Route path="/permissions" element={<Permissions />} />
      <Route path="/permissions-admin" element={<PermissionsAdmin />} />

      <Route path="/achievements" element={<MyAchievements />} />
      <Route path="/achievements-admin" element={<AchievementAdmin />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    
  <Route path="/auth/callback" element={<AuthCallback />} />
  <Route path="/dashboard" element={<AllianceDashboard />} />
  <Route path="/alliance/:allianceId/permissions" element={<OwnerPermissions />} />
</Routes>
  );
}



