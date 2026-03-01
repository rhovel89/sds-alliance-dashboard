import { Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import RequireAlliance from "../components/RequireAlliance";
import RequireAllianceAccess from "../components/auth/RequireAllianceAccess";
import RequireAdmin from "../components/auth/RequireAdmin";
import SystemStatusPage from "../pages/SystemStatusPage";
import StateAlertsDbPage from "../pages/state/StateAlertsDbPage";
import StateDiscussionDbPage from "../pages/state/StateDiscussionDbPage";

import AuthLandingPage from "../pages/AuthLandingPage";
import AuthCallback from "../pages/AuthCallback";
import StateAlertsDbPage from "../pages/state/StateAlertsDbPage";
import StateDiscussionDbPage from "../pages/state/StateDiscussionDbPage";

import RequestAccessPage from "../pages/onboarding/RequestAccessPage";
import MyDashboardsPage from "../pages/dashboard/MyDashboardsPage";
import StateAlertsDbPage from "../pages/state/StateAlertsDbPage";
import StateDiscussionDbPage from "../pages/state/StateDiscussionDbPage";

import MyAlliance from "../pages/MyAlliance";
import EventsPage from "../pages/EventsPage";
import StateAlertsDbPage from "../pages/state/StateAlertsDbPage";
import StateDiscussionDbPage from "../pages/state/StateDiscussionDbPage";

import AllianceHQMap from "../pages/dashboard/AllianceHQMap";
import PermissionsPage from "../pages/dashboard/Permissions";
import AllianceCalendarPage from "../pages/calendar/AllianceCalendarPage";
import StateAlertsDbPage from "../pages/state/StateAlertsDbPage";
import StateDiscussionDbPage from "../pages/state/StateDiscussionDbPage";

import AllianceAnnouncementsPage from "../pages/alliance/AllianceAnnouncementsPage";
import AllianceGuidesPage from "../pages/alliance/AllianceGuidesPage";
import StateAlertsDbPage from "../pages/state/StateAlertsDbPage";
import StateDiscussionDbPage from "../pages/state/StateDiscussionDbPage";

import PlayerDashboardPage from "../pages/PlayerDashboardPage";
import StateAlertsDbPage from "../pages/state/StateAlertsDbPage";
import StateDiscussionDbPage from "../pages/state/StateDiscussionDbPage";

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
import StateAlertsDbPage from "../pages/state/StateAlertsDbPage";
import StateDiscussionDbPage from "../pages/state/StateDiscussionDbPage";

import StateDashboardPage from "../pages/state/StateDashboardPage";
import StateLeadersPage from "../pages/state/StateLeadersPage";
import OwnerDiscordSettingsPage from "../pages/owner/OwnerDiscordSettingsPage";
import StateAlertsDbPage from "../pages/state/StateAlertsDbPage";
import StateDiscussionDbPage from "../pages/state/StateDiscussionDbPage";

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
import DebugPage from "../pages/DebugPage";
import PlayerDashboardSafePage from "../pages/PlayerDashboardSafePage";
import OwnerOneClickProvisionPage from "../pages/owner/OwnerOneClickProvisionPage";
import OwnerEventTypesLibraryPage from "../pages/owner/OwnerEventTypesLibraryPage";
import OwnerAllianceJumpPage from "../pages/owner/OwnerAllianceJumpPage";
import State789AlertsPage from "../pages/state/State789AlertsPage";
import State789DiscussionBoardPage from "../pages/state/State789DiscussionBoardPage";
import State789DiscussionBoardV2Page from "../pages/state/State789DiscussionBoardV2Page";
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
import OwnerStateAchievementsPage from "../pages/owner/OwnerStateAchievementsPage";
import State789AchievementsTrackerPage from "../pages/state/State789AchievementsTrackerPage";
import State789AchievementsProgressPage from "../pages/state/State789AchievementsProgressPage";
import State789AchievementsFormPage from "../pages/state/State789AchievementsFormPage";
import OwnerStateAchievementsQueuePage from "../pages/owner/OwnerStateAchievementsQueuePage";
import OwnerStateAchievementsAccessPage from "../pages/owner/OwnerStateAchievementsAccessPage";
import OwnerStateAchievementsAdminPage from "../pages/owner/OwnerStateAchievementsAdminPage";
import State789AchievementRequestPage from "../pages/state/State789AchievementRequestPage";
import OwnerStateAchievementRequestsPage from "../pages/owner/OwnerStateAchievementRequestsPage";
import State789AchievementProgressPage from "../pages/state/State789AchievementProgressPage";
import OwnerStateAchievementCatalogPage from "../pages/owner/OwnerStateAchievementCatalogPage";
import OwnerDiscordTemplatesPage from "../pages/owner/OwnerDiscordTemplatesPage";
import OwnerDiscordMentionsToolsPage from "../pages/owner/OwnerDiscordMentionsToolsPage";
import OwnerRealtimeHistoryPage from "../pages/owner/OwnerRealtimeHistoryPage";
import OwnerOneClickProvisionPlusPage from "../pages/owner/OwnerOneClickProvisionPlusPage";
import OwnerStateAchievementInboxPage from "../pages/owner/OwnerStateAchievementInboxPage";
import OwnerDiscordEdgeSendTestPage from "../pages/owner/OwnerDiscordEdgeSendTestPage";
import OwnerDataVaultPage from "../pages/owner/OwnerDataVaultPage";
import State789OpsConsolePage from "../pages/state/State789OpsConsolePage";
import State789AlertsCenterPage from "../pages/state/State789AlertsCenterPage";
import MyMailInboxPage from "../pages/mail/MyMailInboxPage";
import OwnerMailBroadcastPage from "../pages/owner/OwnerMailBroadcastPage";
import AllianceDirectoryDbPage from "../pages/alliance/AllianceDirectoryDbPage";
import OwnerDirectoryDbPage from "../pages/owner/OwnerDirectoryDbPage";
import OwnerPermissionsDbPage from "../pages/owner/OwnerPermissionsDbPage";
import AllianceAlertsPage from "../pages/alliance/AllianceAlertsPage";
import State789AlertsDbPage from "../pages/state/State789AlertsDbPage";
import State789DiscussionDbPage from "../pages/state/State789DiscussionDbPage";
import OwnerLiveOpsDbPage from "../pages/owner/OwnerLiveOpsDbPage";
import State789AchievementRequestV2Page from "../pages/state/State789AchievementRequestV2Page";
import State789AchievementsAdminV2Page from "../pages/state/State789AchievementsAdminV2Page";
import OwnerOnboardingQueuePage from "../pages/owner/OwnerOnboardingQueuePage";
import MyMailThreadsPage from "../pages/mail/MyMailThreadsPage";
import MyHqManagerPage from "../pages/me/MyHqManagerPage";
import OwnerDiscordQueuePage from "../pages/owner/OwnerDiscordQueuePage";
import OwnerPermissionsMatrixV2Page from "../pages/owner/OwnerPermissionsMatrixV2Page";
import OwnerAllianceDirectorySyncPage from "../pages/owner/OwnerAllianceDirectorySyncPage";
import StateAlertsDbPage from "../pages/state/StateAlertsDbPage";
import StateDiscussionDbPage from "../pages/state/StateDiscussionDbPage";
import OwnerPermissionsMatrixV3Page from "../pages/owner/OwnerPermissionsMatrixV3Page";
import OwnerActivityFeedPage from "../pages/owner/OwnerActivityFeedPage";
import OwnerCommandCenterV2Page from "../pages/owner/OwnerCommandCenterV2Page";
import StateOpsBoardDbPage from "../pages/state/StateOpsBoardDbPage";
import OwnerStateLeadersAdminPage from "../pages/owner/OwnerStateLeadersAdminPage";
import AllianceRosterPage from "../pages/alliance/AllianceRosterPage";
import OwnerEventRemindersPage from "../pages/owner/OwnerEventRemindersPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/owner/directory-sync" element={<RequireAdmin><OwnerAllianceDirectorySyncPage /></RequireAdmin>} />
      <Route path="/owner/permissions-matrix-v3-v2" element={<Navigate to="/owner/permissions-matrix-v3-v3" replace />} />
      <Route path="/me/hq-manager" element={<MyHqManagerPage />} />
      <Route path="/owner/discord-queue" element={<RequireAdmin><OwnerDiscordQueuePage /></RequireAdmin>} />
      <Route path="/mail-threads" element={<MyMailThreadsPage />} />
      <Route path="/owner/onboarding-queue" element={<RequireAdmin><OwnerOnboardingQueuePage /></RequireAdmin>} />
      <Route path="/state/789/achievements/request-v2" element={<State789AchievementRequestV2Page />} />
      <Route path="/state/789/achievements/admin-v2" element={<State789AchievementsAdminV2Page />} />
      <Route path="/state/789/alerts-db" element={<State789AlertsDbPage />} />
      <Route path="/state/789/discussion-db" element={<State789DiscussionDbPage />} />
      <Route path="/owner/live-ops-db" element={<RequireAdmin><OwnerLiveOpsDbPage /></RequireAdmin>} />
      <Route path="/owner/permissions-db" element={<Navigate to="/owner/permissions-matrix-v3-v3" replace />} />
      <Route path="/alliances-v2" element={<AllianceDirectoryDbPage />} />
      <Route path="/owner/directory-db" element={<RequireAdmin><OwnerDirectoryDbPage /></RequireAdmin>} />
      <Route path="/owner/mail-broadcast" element={<RequireAdmin><OwnerMailBroadcastPage /></RequireAdmin>} />
      <Route path="/owner/data-vault" element={<RequireAdmin><OwnerDataVaultPage /></RequireAdmin>} />
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
      <Route path="/owner/state-leaders" element={<RequireAdmin><OwnerStateLeadersAdminPage /></RequireAdmin>} />
      <Route path="/owner/roles" element={<RequireAdmin><OwnerRolesPermissionsV2Page /></RequireAdmin>} />
      <Route path="/owner/event-types" element={<RequireAdmin><OwnerEventTypesPage /></RequireAdmin>} />
      <Route path="/owner/access-control" element={<RequireAdmin><OwnerAccessControlPage /></RequireAdmin>} />

      {/* State */}
      <Route path="/state" element={<Navigate to="/state/789" replace />} />

      {/* Alliance dashboards (IMPORTANT: announcements/guides are NESTED so alliance context exists) */}
      <Route path="/dashboard/:alliance_id" element={<DashboardLayout />}>
        <Route index element={<AllianceDashboardIndexPage />} />

        <Route path="announcements" element={<AllianceAnnouncementsPage />} />

        <Route path="alerts" element={<AllianceAlertsPage />} />
        <Route path="guides" element={<AllianceGuidesPage />} />
        <Route path="roster" element={<RequireAllianceAccess><AllianceRosterPage /></RequireAllianceAccess>} />

        <Route path="hq-map" element={<AllianceHQMap />} />
        <Route path="calendar" element={<RequireAllianceAccess><AllianceCalendarPage /></RequireAllianceAccess>} />

        <Route path="permissions" element={<RequireAlliance><PermissionsPage /></RequireAlliance>} />
        <Route path="events" element={<RequireAlliance><EventsPage /></RequireAlliance>} />
      </Route>

      {/* fallback */}
      <Route path="/state/789" element={<State789DashboardPage />} />
      <Route path="/alliances" element={<AllianceDirectoryPage />} />
      <Route path="/mail" element={<MyMailPage />} />
      <Route path="/mail-v2" element={<MyMailInboxPage />} />
      <Route path="/owner/alliance-directory" element={<RequireAdmin><OwnerAllianceDirectoryEditorPage /></RequireAdmin>} />
      <Route path="/debug" element={<DebugPage />} />
      <Route path="/owner/oneclick-provision" element={<RequireAdmin><OwnerOneClickProvisionPage /></RequireAdmin>} />
      <Route path="/owner/event-types-library" element={<RequireAdmin><OwnerEventTypesLibraryPage /></RequireAdmin>} />
      <Route path="/owner/jump" element={<RequireAdmin><OwnerAllianceJumpPage /></RequireAdmin>} />
      <Route path="/state/789/alerts" element={<State789AlertsPage />} />
      <Route path="/state/789/alerts-v2" element={<State789AlertsCenterPage />} />
      <Route path="/state/789/discussion" element={<State789DiscussionBoardPage />} />
      <Route path="/state/789/discussion-v2" element={<State789DiscussionBoardV2Page />} />
      <Route path="/state/789/ops" element={<State789OpsConsolePage />} />
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
      <Route path="/owner/state-achievements" element={<RequireAdmin><OwnerStateAchievementsPage /></RequireAdmin>} />
      <Route path="/state/789/achievements-tracker" element={<State789AchievementsTrackerPage />} />
      <Route path="/state/789/achievements-progress" element={<State789AchievementsProgressPage />} />
      <Route path="/state/789/achievements-form" element={<State789AchievementsFormPage />} />
      <Route path="/owner/state-achievements/queue" element={<RequireAdmin><OwnerStateAchievementsQueuePage /></RequireAdmin>} />
      <Route path="/owner/state-achievements/access" element={<RequireAdmin><OwnerStateAchievementsAccessPage /></RequireAdmin>} />
      <Route path="/owner/state-achievements/admin" element={<RequireAdmin><OwnerStateAchievementsAdminPage /></RequireAdmin>} />
      <Route path="/state/789/achievements/request" element={<State789AchievementRequestPage />} />
      <Route path="/owner/state-achievement-requests" element={<RequireAdmin><OwnerStateAchievementRequestsPage /></RequireAdmin>} />
      <Route path="/state/789/progress" element={<State789AchievementProgressPage />} />
      <Route path="/owner/state-achievement-catalog" element={<RequireAdmin><OwnerStateAchievementCatalogPage /></RequireAdmin>} />
      <Route path="/owner/discord-templates" element={<RequireAdmin><OwnerDiscordTemplatesPage /></RequireAdmin>} />
      <Route path="/owner/discord-mentions-tools" element={<RequireAdmin><OwnerDiscordMentionsToolsPage /></RequireAdmin>} />
      <Route path="/owner/realtime-history" element={<RequireAdmin><OwnerRealtimeHistoryPage /></RequireAdmin>} />
      <Route path="/owner/oneclick-provision-plus" element={<RequireAdmin><OwnerOneClickProvisionPlusPage /></RequireAdmin>} />
      <Route path="/state/789/achievement-request" element={<State789AchievementRequestPage />} />
      <Route path="/owner/state-achievement-inbox" element={<RequireAdmin><OwnerStateAchievementInboxPage /></RequireAdmin>} />
      <Route path="/owner/discord-edge-test" element={<RequireAdmin><OwnerDiscordEdgeSendTestPage /></RequireAdmin>} />
            <Route path="/state/:state_code/alerts-db" element={<StateAlertsDbPage />} />
      <Route path="/state/:state_code/discussion-db" element={<StateDiscussionDbPage />} />
      <Route path="/owner/permissions-matrix-v3-v3" element={<RequireAdmin><OwnerPermissionsMatrixV3Page /></RequireAdmin>} />
            <Route path="/owner/permissions-matrix-v3" element={<Navigate to="/owner/permissions-matrix-v3-v3" replace />} />
      <Route path="/owner/activity-feed" element={<RequireAdmin><OwnerActivityFeedPage /></RequireAdmin>} />
      <Route path="/owner/command-center" element={<RequireAdmin><OwnerCommandCenterV2Page /></RequireAdmin>} />
      <Route path="/state/:state_code/ops-db" element={<StateOpsBoardDbPage />} />
      <Route path="/state/789/ops-db" element={<StateOpsBoardDbPage />} />
      <Route path="/state/789/ops" element={<Navigate to="/state/789/ops-db" replace />} />
            <Route path="/owner/event-reminders" element={<RequireAdmin><OwnerEventRemindersPage /></RequireAdmin>} />
      <Route path="*" element={<Navigate to="/me" replace />} />
</Routes>
  );
}



























