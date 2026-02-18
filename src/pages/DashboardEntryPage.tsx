import { useMemo } from "react";
import AuthCallback from "./AuthCallback";
import MyDashboardsPage from "./dashboard/MyDashboardsPage";

function looksLikeAuthCallback(): boolean {
  try {
    const q = window.location.search || "";
    const h = window.location.hash || "";
    // PKCE uses ?code=..., implicit uses #access_token=...
    if (q.includes("code=")) return true;
    if (h.includes("access_token=")) return true;
    if (h.includes("error=") || q.includes("error=")) return true;
    return false;
  } catch {
    return false;
  }
}

export default function DashboardEntryPage() {
  const isCb = useMemo(() => looksLikeAuthCallback(), []);
  return isCb ? <AuthCallback /> : <MyDashboardsPage />;
}
