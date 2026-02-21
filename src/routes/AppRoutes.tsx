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
import State789DashboardPage from "../pages/state/State789DashboardPage";
import AllianceDirectoryPage from "../pages/alliance/AllianceDirectoryPage";
import AllianceDashboardIndexPage from "../pages/alliance/AllianceDashboardIndexPage";
import MyMailPage from "../pages/mail/MyMailPage";
import OwnerAllianceDirectoryEditorPage from "../pages/owner/OwnerAllianceDirectoryEditorPage";
import OwnerPermissionsMatrixShellPage from "../pages/owner/OwnerPermissionsMatrixShellPage";
import DebugPage from "../pages/DebugPage";
import PlayerDashboardSafePage from "../pages/PlayerDashboardSafePage";
import OwnerOneClickProvisionPage from "../pages/owner/OwnerOneClickProvisionPage";
import OwnerEventTypesLibraryPage from "../pages/owner/OwnerEventTypesLibraryPage";
import OwnerAllianceJumpPage from "../pages/owner/OwnerAllianceJumpPage";
import State789AlertsPage from "../pages/state/State789AlertsPage";
import State789DiscussionBoardPage from "../pages/state/State789DiscussionBoardPage";
import OwnerBroadcastComposerPage from "../pages/owner/OwnerBroadcastComposerPage";
import MyMailShellPage from "../pages/mail/MyMailShellPage";
import OwnerLiveOpsPage from "../pages/owner/OwnerLiveOpsPage";
import OwnerDiscordMentionsPage from "../pages/owner/OwnerDiscordMentionsPage";
import OwnerDiscordSendLogPage from "../pages/owner/OwnerDiscordSendLogPage";
import OwnerDiscordTestSendPage from "../pages/owner/OwnerDiscordTestSendPage";
import OwnerDiscordDefaultsPage from "../pages/owner/OwnerDiscordDefaultsPage";
import OwnerScheduledDiscordSendsPage from "../pages/owner/OwnerScheduledDiscordSendsPage";
import OwnerPermissionsMatrixPage from "../pages/owner/OwnerPermissionsMatrixPage";
import OwnerScheduledSendsPage from "../pages/owner/OwnerScheduledSendsPage";
import OwnerDirectoryEditorPage from "../pages/owner/OwnerDirectoryEditorPage";
import State789AchievementsPage from "../pages/state/State789AchievementsPage";
import OwnerAchievementRequestsPage from "../pages/owner/OwnerAchievementRequestsPage";
import OwnerAchievementConfigPage from "../pages/owner/OwnerAchievementConfigPage";
import OwnerAchievementAccessPage from "../pages/owner/OwnerAchievementAccessPage";

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
      <Route path="/me" element={<PlayerDashboardSafePage />} />
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
      <Route path="/dashboard/:alliance_id" element={<DashboardLayout />}>
        <Route index element={<AllianceDashboardIndexPage />} />

        <Route path="announcements" element={<AllianceAnnouncementsPage />} />
        <Route path="guides" element={<AllianceGuidesPage />} />

        <Route path="hq-map" element={<AllianceHQMap />} />
        <Route path="calendar" element={<RequireAllianceAccess><AllianceCalendarPage /></RequireAllianceAccess>} />

        <Route path="permissions" element={<RequireAlliance><PermissionsPage /></RequireAlliance>} />
        <Route path="events" element={<RequireAlliance><EventsPage /></RequireAlliance>} />
      </Route>

      {/* fallback */}
      <Route path="/state/789" element={<State789DashboardPage />} />
      <Route path="/alliances" element={<AllianceDirectoryPage />} />
      <Route path="/mail" element={<MyMailPage />} />
      <Route path="/owner/alliance-directory" element={<RequireAdmin><OwnerAllianceDirectoryEditorPage /></RequireAdmin>} />
      <Route path="/owner/permissions-matrix" element={<RequireAdmin><OwnerPermissionsMatrixShellPage /></RequireAdmin>} />
      <Route path="/debug" element={<DebugPage />} />
      <Route path="/owner/oneclick-provision" element={<RequireAdmin><OwnerOneClickProvisionPage /></RequireAdmin>} />
      <Route path="/owner/event-types-library" element={<RequireAdmin><OwnerEventTypesLibraryPage /></RequireAdmin>} />
      <Route path="/owner/jump" element={<RequireAdmin><OwnerAllianceJumpPage /></RequireAdmin>} />
      <Route path="/state/789/alerts" element={<State789AlertsPage />} />
      <Route path="/state/789/discussion" element={<State789DiscussionBoardPage />} />
      <Route path="/owner/broadcast" element={<RequireAdmin><OwnerBroadcastComposerPage /></RequireAdmin>} />
      <Route path="/owner/live-ops" element={<RequireAdmin><OwnerLiveOpsPage /></RequireAdmin>} />
      <Route path="/owner/discord-mentions" element={<RequireAdmin><OwnerDiscordMentionsPage /></RequireAdmin>} />
      <Route path="/owner/discord-send-log" element={<RequireAdmin><OwnerDiscordSendLogPage /></RequireAdmin>} />
      <Route path="/owner/discord-test-send" element={<RequireAdmin><OwnerDiscordTestSendPage /></RequireAdmin>} />
      <Route path="/owner/discord-defaults" element={<RequireAdmin><OwnerDiscordDefaultsPage /></RequireAdmin>} />
      <Route path="/owner/scheduled-sends" element={<RequireAdmin><OwnerScheduledDiscordSendsPage /></RequireAdmin>} />
      <Route path="/owner/directory-editor" element={<RequireAdmin><OwnerAllianceDirectoryEditorPage /></RequireAdmin>} />
      <Route path="/state/789/achievements" element={<State789AchievementsPage />} />
      <Route path="/owner/achievements/requests" element={<RequireAdmin><OwnerAchievementRequestsPage /></RequireAdmin>} />
      <Route path="/owner/achievements/config" element={<RequireAdmin><OwnerAchievementConfigPage /></RequireAdmin>} />
      <Route path="/owner/achievements/access" element={<RequireAdmin><OwnerAchievementAccessPage /></RequireAdmin>} />
      <Route path="*" element={<Navigate to="/me" replace />} />
</Routes>
  );
}
