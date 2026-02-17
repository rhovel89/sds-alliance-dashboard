import { Routes, Route } from "react-router-dom";

import RequireAlliance from "../components/RequireAlliance";
import RequireAllianceAccess from "../components/auth/RequireAllianceAccess";
import RequireAdmin from "../components/auth/RequireAdmin";

import AuthLandingPage from "../pages/AuthLandingPage";
import AuthCallback from "../pages/AuthCallback";
import RequestAccessPage from "../pages/onboarding/RequestAccessPage";

import DashboardGate from "../pages/DashboardGate";
import PlayerDashboardPage from "../pages/PlayerDashboardPage";

import MyDashboardsPage from "../pages/dashboard/MyDashboardsPage";

import MyAlliance from "../pages/MyAlliance";
import EventsPage from "../pages/EventsPage";
import AllianceHQMap from "../pages/dashboard/AllianceHQMap";
import PermissionsPage from "../pages/dashboard/Permissions";
import AllianceCalendarPage from "../pages/calendar/AllianceCalendarPage";
import AllianceAnnouncementsPage from "../pages/alliance/AllianceAnnouncementsPage";
import AllianceGuidesPage from "../pages/alliance/AllianceGuidesPage";

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

import StateDashboardPage from "../pages/state/StateDashboardPage";
import StateLeadersPage from "../pages/state/StateLeadersPage";

// Optional legacy page (keep if you still use /state/1 somewhere)
import StateDashboard from "../pages/StateDashboard";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<AuthLandingPage />} />

      {/* IMPORTANT: keep this if your OAuth redirect URL is /dashboard */}
      <Route path="/dashboard" element={<AuthCallback />} />

      {/* If you want the dashboards list page, use /dashboards (NOT /dashboard) */}
      <Route path="/dashboards" element={<MyDashboardsPage />} />
      <Route path="/onboarding" element={<RequestAccessPage />} />

      {/* ME dashboard aliases */}
      <Route path="/me" element={<PlayerDashboardPage />} />
      <Route path="/dashboard/ME" element={<PlayerDashboardPage />} />

      {/* Alliance Dashboard (and ME fallback if someone types /dashboard/me) */}
      <Route path="/dashboard/:alliance_id" element={<DashboardGate />}>
        <Route index element={<MyAlliance />} />

        <Route path="announcements" element={<AllianceAnnouncementsPage />} />
        <Route path="guides" element={<AllianceGuidesPage />} />

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
      <Route
        path="/owner"
        element={
          <RequireAdmin>
            <OwnerDashboardPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/owner/select"
        element={
          <RequireAdmin>
            <OwnerDashboardSelect />
          </RequireAdmin>
        }
      />
      <Route
        path="/owner/requests"
        element={
          <RequireAdmin>
            <OwnerAccessRequestsPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/owner/memberships"
        element={
          <RequireAdmin>
            <OwnerMembershipsPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/owner/alliances"
        element={
          <RequireAdmin>
            <OwnerAlliancesPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/owner/players"
        element={
          <RequireAdmin>
            <OwnerPlayersPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/owner/membership"
        element={
          <RequireAdmin>
            <OwnerMembershipManagerPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/owner/requests-provision"
        element={
          <RequireAdmin>
            <OwnerRequestsProvisionPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/owner/players-link"
        element={
          <RequireAdmin>
            <OwnerPlayersLinkPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/owner/state"
        element={
          <RequireAdmin>
            <OwnerStateManagerPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/owner/state-leaders"
        element={
          <RequireAdmin>
            <StateLeadersPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/owner/roles"
        element={
          <RequireAdmin>
            <OwnerRolesPermissionsV2Page />
          </RequireAdmin>
        }
      />
      <Route
        path="/owner/access-control"
        element={
          <RequireAdmin>
            <OwnerAccessControlPage />
          </RequireAdmin>
        }
      />

      {/* State */}
      <Route path="/state" element={<StateDashboardPage />} />
      <Route path="/state/1" element={<StateDashboard />} />
    </Routes>
  );
}
