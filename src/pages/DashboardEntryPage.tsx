import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import AuthCallback from "./AuthCallback";
import MyDashboardsPage from "./dashboard/MyDashboardsPage";

/**
 * /dashboard serves TWO purposes:
 *  - Supabase OAuth callback (hash contains access_token/refresh_token OR query has code)
 *  - Normal "My Dashboards" entry page
 */
export default function DashboardEntryPage() {
  const loc = useLocation();

  const isAuthCallback = useMemo(() => {
    const hash = String(loc.hash || "");
    const qs = new URLSearchParams(loc.search || "");
    return (
      hash.includes("access_token=") ||
      hash.includes("refresh_token=") ||
      qs.has("code") ||
      qs.has("error_description") ||
      qs.has("error")
    );
  }, [loc.hash, loc.search]);

  if (isAuthCallback) return <AuthCallback />;

  return <MyDashboardsPage />;
}
