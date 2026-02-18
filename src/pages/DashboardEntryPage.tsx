import { useMemo } from "react";
import AuthCallback from "./AuthCallback";
import MyDashboardsPage from "./dashboard/MyDashboardsPage";

function hasAuthCallbackParams() {
  try {
    const search = window.location.search || "";
    const hash = window.location.hash || "";

    // PKCE callback commonly uses ?code=...
    if (/\bcode=/.test(search)) return true;

    // Implicit flow or some providers use tokens in hash
    if (/\baccess_token=/.test(hash)) return true;
    if (/\brefresh_token=/.test(hash)) return true;

    // Sometimes errors appear here too
    if (/\berror=/.test(search) || /\berror_description=/.test(search)) return true;
    return false;
  } catch {
    return false;
  }
}

export default function DashboardEntryPage() {
  const isCallback = useMemo(() => hasAuthCallbackParams(), []);
  return isCallback ? <AuthCallback /> : <MyDashboardsPage />;
}
