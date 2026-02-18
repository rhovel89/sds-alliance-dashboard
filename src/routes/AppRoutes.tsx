import { Routes, Route, Navigate } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import RequireAlliance from "../components/RequireAlliance";
import RequireAllianceAccess from "../components/auth/RequireAllianceAccess";
import RequireAdmin from "../components/auth/RequireAdmin";

import AuthLandingPage from "../pages/AuthLandingPage";
import AuthCallback from "../pages/AuthCallback";
import RequestAccessPage from "../pages/onboarding/RequestAccessPage";

import MyAlliance from "../pages/MyAlliance";
import EventsPage from "../pages/EventsPage";
import AllianceHQMap from "../pages/dashboard/AllianceHQMap";
import PermissionsPage from "../pages/dashboard/Permissions";
import AllianceCalendarPage from "../pages/calendar/AllianceCalendarPage";

import AllianceAnnouncementsPage from "../pages/alliance/AllianceAnnouncementsPage";
import AllianceGuidesPage from "../pages/alliance/AllianceGuidesPage";

import MyDashboardsPage from "../pages/dashboard/MyDashboardsPage";
import PlayerDashboardPage from "../pages/PlayerDashboardPage";
import DashboardGate from "../pages/DashboardGate";

/** Owner / State pages (keep yours) */
import OwnerDashboardSelect from "../pages/OwnerDashboardSelect";
import OwnerDashboardPage from "../pages/owner/OwnerDashboardPage";
import OwnerAccessRequestsPage from "../pages/owner/OwnerAccessRequestsPage";
import OwnerMembershipsPage from "../pages/owner/OwnerMembershipsPage";
import OwnerAlliancesPage from "../pages/owner/OwnerAlliancesPage";
import OwnerPlayersPage from "../pages/owner/OwnerPlayersPage";
import OwnerMembershipManagerPage from "../pages/owner/OwnerMembershipManagerPage";
import OwnerRequestsProvisionPage from "../pages/owner/OwnerRequestsProvisionPage";
import OwnerPlayersLinkPage from "../pages/owner/OwnerPlayersLinkPage";
import OwnerStateManagerPage from "../pages/owner/OwnerStateManagerPage";
import StateDashboardPage from "../pages/state/StateDashboardPage";
import StateLeadersPage from "../pages/state/StateLeadersPage";
import OwnerRolesPermissionsV2Page from "../pages/owner/OwnerRolesPermissionsV2Page";
import OwnerAccessControlPage from "../pages/owner/OwnerAccessControlPage";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<AuthLandingPage />} />

      {/* Auth callback (keep your existing flow) */}
      <Route path="/dashboard" element={<AuthCallback />} />

      {/* Onboarding */}
      <Route path="/onboarding" element={<RequestAccessPage />} />

      {/* Dashboards list (new, avoids collision with /dashboard callback) */}
      <Route path="/dashboards" element={<MyDashboardsPage />} />

      {/* Personal */}
      <Route path="/me" element={<PlayerDashboardPage />} />
      <Route path="/dashboard/ME" element={<Navigate to="/me" replace />} />

      {/* Alliance Announcements + Guides (players can view) */}
      <Route path="/dashboard/:code/announcements" element={<AllianceAnnouncementsPage />} />
      <Route path="/dashboard/:code/guides" element={<AllianceGuidesPage />} />

      {/* Alliance Dashboard (manage pages) */}
      <Route path="/dashboard/:code" element={<DashboardLayout />}>
        {/* Only managers can see the ROOT alliance dashboard */}
        <Route index element={<DashboardGate />} />

        <Route path="hq-map" element={<AllianceHQMap />} />

        <Route
          path="calendar"
          element={
            <RequireAllianceAccess>
              <AllianceCalendarPage />
            </RequireAllianceAccess>
          }
        />

        <Route
          path="permissions"
          element={
            <RequireAlliance>
              <PermissionsPage />
            </RequireAlliance>
          }
        />

        <Route
          path="events"
          element={
            <RequireAlliance>
              <EventsPage />
            </RequireAlliance>
          }
        />
      </Route>

      {/* Owner */}
      <Route path="/owner" element={<RequireAdmin><OwnerDashboardPage /></RequireAdmin>} />
      <Route path="/owner/select" element={<RequireAdmin><OwnerDashboardSelect /></RequireAdmin>} />
      <Route path="/owner/requests" element={<RequireAdmin><OwnerAccessRequestsPage /></RequireAdmin>} />
      <Route path="/owner/memberships" element={<RequireAdmin><OwnerMembershipsPage /></RequireAdmin>} />
      <Route path="/owner/alliances" element={<RequireAdmin><OwnerAlliancesPage /></RequireAdmin>} />
      <Route path="/owner/players" element={<RequireAdmin><OwnerPlayersPage /></RequireAdmin>} />
      <Route path="/owner/membership" element={<RequireAdmin><OwnerMembershipManagerPage /></RequireAdmin>} />
      <Route path="/owner/requests-provision" element={<RequireAdmin><OwnerRequestsProvisionPage /></RequireAdmin>} />
      <Route path="/owner/players-link" element={<RequireAdmin><OwnerPlayersLinkPage /></RequireAdmin>} />
      <Route path="/owner/state" element={<RequireAdmin><OwnerStateManagerPage /></RequireAdmin>} />
      <Route path="/owner/state-leaders" element={<RequireAdmin><StateLeadersPage /></RequireAdmin>} />
      <Route path="/owner/roles" element={<RequireAdmin><OwnerRolesPermissionsV2Page /></RequireAdmin>} />
      <Route path="/owner/access-control" element={<RequireAdmin><OwnerAccessControlPage /></RequireAdmin>} />

      {/* State */}
      <Route path="/state" element={<StateDashboardPage />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
