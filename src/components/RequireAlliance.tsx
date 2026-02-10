import { useEffect, useState } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const OWNER_ID = "1bf14480-765e-4704-89e6-63bfb02e1187";

export default function RequireAlliance() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;

      // Not logged in
      if (!user) {
        setAllowed(false);
        return;
      }

      // Owner override — full access everywhere
      if (user.id === OWNER_ID) {
        setAllowed(true);
        return;
      }

      // Must have alliance in URL
      if (!alliance_id) {
        setAllowed(false);
        return;
      }

      // Normal alliance member check
      supabase
        .from("alliance_members")
        .select("id")
        .eq("user_id", user.id)
        .eq("alliance_id", alliance_id)
        .single()
        .then(({ data }) => {
          setAllowed(!!data);
        });
    });
  }, [alliance_id]);

  if (allowed === null) {
    return <div style={{ padding: 20 }}>Checking access…</div>;
  }

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
