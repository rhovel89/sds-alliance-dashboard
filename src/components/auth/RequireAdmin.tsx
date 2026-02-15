import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useIsAppAdmin } from "../../hooks/useIsAppAdmin";

export default function RequireAdmin(props: { children: ReactNode }) {
  const { isAdmin, loading } = useIsAppAdmin();

  if (loading) {
    return <div style={{ padding: 24, opacity: 0.8 }}>Checking admin access…</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{props.children}</>;
}
