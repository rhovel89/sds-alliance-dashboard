import { Navigate, Outlet, useParams } from "react-router-dom";

export default function RequireAlliance() {
  const { alliance_id } = useParams<{ alliance_id: string }>();

  if (!alliance_id) {
    return <Navigate to="/owner/select" replace />;
  }

  return <Outlet />;
}
