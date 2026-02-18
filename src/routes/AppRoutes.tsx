import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import RequireAlliance from "../components/RequireAlliance";
import RequireAllianceAccess from "../components/auth/RequireAllianceAccess";
import RequireAdmin from "../components/auth/RequireAdmin";

import AuthLandingPage from "../pages/AuthLandingPage";
import DashboardEntryPage from "../pages/DashboardEntryPage";
import RequestAccessPage from "../pages/onboarding/RequestAccessPage";
import Login from "../pages/Login";

import PlayerDashboardPage from "../pages/PlayerDashboardPage";

import MyDashboardsPage from "../pages/dashboard/MyDashboardsPage";

import MyAlliance from "../pages/MyAlliance";
import EventsPage from "../pages/EventsPage";
import AllianceHQMap from "../pages/dashboard/AllianceHQMap";
import PermissionsPage from "../pages/dashboard/Permissions";
import AllianceCalendarPage from "../pages/calendar/AllianceCalendarPage";

import StateDashboardPage from "../pages/state/StateDashboardPage";
import StateLeadersPage from "../pages/state/StateLeadersPage";

import OwnerDashboardSelect from "../pages/OwnerDashboardSelect";
import OwnerDashboardPage from "../pages/owner/OwnerDashboardPage";
import OwnerMembershipManagerPage from "../pages/owner/OwnerMembershipManagerPage";
import OwnerAccessRequestsPage from "../pages/owner/OwnerAccessRequestsPage";
import OwnerMembershipsPage from "../pages/owner/OwnerMembershipsPage";
import OwnerAlliancesPage from "../pages/owner/OwnerAlliancesPage";
import OwnerPlayersPage from "../pages/owner/OwnerPlayersPage";
import OwnerRequestsProvisionPage from "../pages/owner/OwnerRequestsProvisionPage";
import OwnerPlayersLinkPage from "../pages/owner/OwnerPlayersLinkPage";
import OwnerStateManagerPage from "../pages/owner/OwnerStateManagerPage";
import OwnerRolesPermissionsV2Page from "../pages/owner/OwnerRolesPermissionsV2Page";
import OwnerAccessControlPage from "../pages/owner/OwnerAccessControlPage";

import AllianceAnnouncementsPage from "../pages/alliance/AllianceAnnouncementsPage";
import AllianceGuidesPage from "../pages/alliance/AllianceGuidesPage";
import StateDashboard from "../pages/StateDashboard";


export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<AuthLandingPage />} />
      <Route path="/login" element={<Login />} />

      {/* Onboarding */}
      <Route path="/onboarding" element={<RequestAccessPage />} />

      {/* /dashboard = auth callback OR dashboards list */}
      <Route path="/dashboard" element={<DashboardEntryPage />} />

      {/* Personal dashboard */}
      <Route path="/me" element={<PlayerDashboardPage />} />
      <Route path="/dashboard/ME" element={<Navigate to="/me" replace />} />

      {/* Owner/Admin */}
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
      <Route path="/state" element={<StateDashboardPage />} />      <Route path="/state/1" element={<StateDashboard />} />
      {/* Optional dashboards list alias */}
      <Route path="/dashboards" element={<MyDashboardsPage />} />

      {/* Alliance Dashboard: NESTED (fixes Missing alliance) */}
      <Route path="/dashboard/:alliance_id" element={<DashboardLayout />}>
        <Route
          index
          element={
            <RequireAlliance>
              <MyAlliance />
            </RequireAlliance>
          }
        />

        <Route
          path="announcements"
          element={
            <RequireAlliance>
              <AllianceAnnouncementsPage />
            </RequireAlliance>
          }
        />

        <Route
          path="guides"
          element={
            <RequireAlliance>
              <AllianceGuidesPage />
            </RequireAlliance>
          }
        />

        <Route
          path="hq-map"
          element={
            <RequireAlliance>
              <AllianceHQMap />
            </RequireAlliance>
          }
        />

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
    </Routes>
  );
}
