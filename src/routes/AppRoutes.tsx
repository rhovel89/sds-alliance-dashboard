import { Routes, Route } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import RequireAlliance from "../components/RequireAlliance";

import Login from "../pages/Login";
import AuthCallback from "../pages/AuthCallback";
import MyAlliance from "../pages/MyAlliance";
import EventsPage from "../pages/EventsPage";
import StateDashboard from "../pages/StateDashboard";
import OwnerDashboard from "../pages/OwnerDashboard";
import OwnerDashboardSelect from "../pages/OwnerDashboardSelect";
import OwnerDashboardPage from "../pages/owner/OwnerDashboardPage";
import OwnerMembershipManagerPage from "../pages/owner/OwnerMembershipManagerPage";


import AllianceHQMap from "../pages/dashboard/AllianceHQMap";
import PermissionsPage from "../pages/dashboard/Permissions";

import AllianceCalendarPage from "../pages/calendar/AllianceCalendarPage";
import RequestAccessPage from "../pages/onboarding/RequestAccessPage";
import MyDashboardsPage from "../pages/dashboard/MyDashboardsPage";
import OwnerAccessRequestsPage from "../pages/owner/OwnerAccessRequestsPage";
import OwnerMembershipsPage from "../pages/owner/OwnerMembershipsPage";
import OwnerAlliancesPage from "../pages/owner/OwnerAlliancesPage";
import OwnerPlayersPage from "../pages/owner/OwnerPlayersPage";
import RequireAllianceAccess from "../components/auth/RequireAllianceAccess";
import OwnerAlliancesPage from "../pages/owner/OwnerAlliancesPage";
import OwnerRequestsProvisionPage from "../pages/owner/OwnerRequestsProvisionPage";

export default function AppRoutes() {
  return (
    <Routes>

      {/* Public */}
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<AuthCallback />} />

      {/* Owner */}
      <Route path="/owner" element={<OwnerDashboard />} />
      <Route path="/owner/select" element={<OwnerDashboardSelect />} />
      <Route path="/owner" element={<OwnerDashboardPage />} />


      {/* State */}
      <Route path="/state/1" element={<StateDashboard />} />

      {/* Alliance Dashboard */}
      <Route path="/dashboard/:alliance_id" element={<DashboardLayout />}>
        
        <Route
          index
          element={
            <MyAlliance />
          }
        />

        <Route
          path="hq-map"
          element={
            <AllianceHQMap />
          }
        />

        <Route
          path="calendar"
          element={<RequireAllianceAccess><AllianceCalendarPage  /></RequireAllianceAccess>}
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

      <Route path="/owner/discord" element={<OwnerDashboardPage />} />
  <Route path="/onboarding" element={<RequestAccessPage />} />
  <Route path="/dashboard" element={<MyDashboardsPage />} />
  <Route path="/owner/requests" element={<OwnerAccessRequestsPage />} />
  <Route path="/owner/memberships" element={<OwnerMembershipsPage />} />
  <Route path="/owner/alliances" element={<OwnerAlliancesPage />} />
  <Route path="/owner/players" element={<OwnerPlayersPage />} />
        <Route path="/owner/membership" element={<OwnerMembershipManagerPage />} />
        <Route path="/owner/alliances" element={<OwnerAlliancesPage />} />
              <Route path="/owner/requests-provision" element={<OwnerRequestsProvisionPage />} />
              <Route path="/owner/players-link" element={<OwnerPlayersLinkPage />} />
      </Routes>
  );
}











