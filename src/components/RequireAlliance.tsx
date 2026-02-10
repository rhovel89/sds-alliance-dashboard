import { useEffect, useState } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const OWNER_ID = "775966588200943616";

export default function RequireAlliance() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;

      if (!user) {
        setAllowed(false);
        return;
      }

      if (user.id === OWNER_ID) {
        setAllowed(true);
        return;
      }

      if (!alliance_id) {
        setAllowed(false);
        return;
      }

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
