import { Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import RequireAlliance from "../components/RequireAlliance";
import RequireAllianceAccess from "../components/auth/RequireAllianceAccess";
import RequireAdmin from "../components/auth/RequireAdmin";
import SystemStatusPage from "../pages/SystemStatusPage";

import AuthLandingPage from "../pages/AuthLandingPage";
import AuthCallback from "../pages/AuthCallback";

import RequestAccessPage from "../pages/onboarding/RequestAccessPage";
import MyDashboardsPage from "../pages/dashboard/MyDashboardsPage";

import MyAlliance from "../pages/MyAlliance";
import EventsPage from "../pages/EventsPage";

import AllianceHQMap from "../pages/dashboard/AllianceHQMap";
import PermissionsPage from "../pages/dashboard/Permissions";
import AllianceCalendarPage from "../pages/calendar/AllianceCalendarPage";

import AllianceAnnouncementsPage from "../pages/alliance/AllianceAnnouncementsPage";
import AllianceGuidesPage from "../pages/alliance/AllianceGuidesPage";

import PlayerDashboardPage from "../pages/PlayerDashboardPage";

import OwnerDashboardPage from "../pages/owner/OwnerDashboardPage";
import OwnerDashboardSelect from "../pages/OwnerDashboardSelect";
import OwnerAccessRequestsPage from "../pages/owner/OwnerAccessRequestsPage";
import OwnerMembershipsPage from "../pages/owner/OwnerMembershipsPage";
import OwnerAlliancesPage from "../pages/owner/OwnerAlliancesPage";
import OwnerPlayersPage from "../pages/owner/OwnerPlayersPage";
import OwnerMembershipManagerPage from "../pages/owner/OwnerMembershipManagerPage";
import OwnerRequestsProvisionPage from "../pages/owner/OwnerRequestsProvisionPage";
import OwnerPlayersLinkPage from "../pages/owner/OwnerPlayersLinkPage";
import OwnerStateManagerPage from "../pages/owner/OwnerStateManagerPage";
import OwnerRolesPermissionsV2Page from "../pages/owner/OwnerRolesPermissionsV2Page";
import OwnerAccessControlPage from "../pages/owner/OwnerAccessControlPage";

import StateDashboardPage from "../pages/state/StateDashboardPage";
import StateLeadersPage from "../pages/state/StateLeadersPage";
import OwnerDiscordSettingsPage from "../pages/owner/OwnerDiscordSettingsPage";

function DashboardEntry() {
  const [sp] = useSearchParams();
  const hasAuth =
    sp.has("code") ||
    sp.has("access_token") ||
    sp.has("refresh_token") ||
    sp.has("error") ||
    sp.has("error_description");

  return hasAuth ? <AuthCallback /> : <MyDashboardsPage />;
}
import OwnerEventTypesPage from "../pages/owner/OwnerEventTypesPage";
import AllianceDashboardHomePage from "../pages/alliance/AllianceDashboardHomePage";
import State789DashboardPage from "../pages/state/State789DashboardPage";
import AllianceDirectoryPage from "../pages/alliance/AllianceDirectoryPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/status" element={<SystemStatusPage />} />
      {/* Public */}
      <Route path="/" element={<AuthLandingPage />} />

      {/* This must handle BOTH auth callback AND dashboard selector */}
      <Route path="/dashboard" element={<DashboardEntry />} />

      {/* Onboarding */}
      <Route path="/onboarding" element={<RequestAccessPage />} />

      {/* Personal dashboard */}
      <Route path="/me" element={<PlayerDashboardPage />} />
      <Route path="/dashboard/ME" element={<Navigate to="/me" replace />} />

      {/* Owner */}
      <Route path="/owner" element={<RequireAdmin><OwnerDashboardPage /></RequireAdmin>} />
  <Route path="/owner/discord" element={<RequireAdmin><OwnerDiscordSettingsPage /></RequireAdmin>} />
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
      <Route path="/owner/event-types" element={<RequireAdmin><OwnerEventTypesPage /></RequireAdmin>} />
      <Route path="/owner/access-control" element={<RequireAdmin><OwnerAccessControlPage /></RequireAdmin>} />

      {/* State */}
      <Route path="/state" element={<StateDashboardPage />} />

      {/* Alliance dashboards (IMPORTANT: announcements/guides are NESTED so alliance context exists) */}
      <Route path="/dashboard/:alliance_id" element={<AllianceDashboardHomePage />}>
        <Route index element={<MyAlliance />} />

        <Route path="announcements" element={<AllianceAnnouncementsPage />} />
        <Route path="guides" element={<AllianceGuidesPage />} />

        <Route path="hq-map" element={<AllianceHQMap />} />
        <Route path="calendar" element={<RequireAllianceAccess><AllianceCalendarPage /></RequireAllianceAccess>} />

        <Route path="permissions" element={<RequireAlliance><PermissionsPage /></RequireAlliance>} />
        <Route path="events" element={<RequireAlliance><EventsPage /></RequireAlliance>} />
      </Route>

      {/* fallback */}
} />
} />
<Route path="/state/789" element={<State789DashboardPage />} />
<Route path="/alliances" element={<AllianceDirectoryPage />} />
<Route path="*" element={<Navigate to="/me" replace />} />
      <Route path="/dashboard/:alliance_id/guides" element={<AllianceGuidesPage />} />
</Routes>
  );
}
