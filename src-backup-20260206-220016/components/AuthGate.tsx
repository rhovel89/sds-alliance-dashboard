import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession } from "../hooks/useSession";

export default function AuthGate() {
  const { session, loading } = useSession();
  const loc = useLocation();

  if (loading) {
    return <div style={{ padding: 24 }}>Initializing session…</div>;
  }

  if (!session) {
    const next = encodeURIComponent(loc.pathname + loc.search + loc.hash);
    return <Navigate to={`/?next=${next}`} replace />;
  }

  return <Outlet />;
}
