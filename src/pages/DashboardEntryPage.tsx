import { useMemo } from "react";
import AuthCallback from "./AuthCallback";
import MyDashboardsPage from "./dashboard/MyDashboardsPage";
import { useNavigate } from "react-router-dom";
import CommandCenterShell from "../components/commandCenter/CommandCenterShell";

function looksLikeAuthCallback(): boolean {
  try {
    const q = window.location.search || "";
    const h = window.location.hash || "";
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
    if (isCb) return <AuthCallback />;

  return (
    <CommandCenterShell
      title="Dashboard"
      subtitle="Select an alliance. Launch ops. Stay alive."
      modules={modules}
      activeModuleKey="dash"
      onSelectModule={onSelectModule}
    >
      <MyDashboardsPage />
    </CommandCenterShell>
  );
}




