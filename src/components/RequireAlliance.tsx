import { useEffect, useState } from "react";
import { Navigate, Outlet, useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const OWNER_ID = "1bf14480-765e-4704-89e6-63bfb02e1187";

export default function RequireAlliance() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getUser();
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

      // Fetch user's actual alliance
      const { data: membership, error } = await supabase
        .from("alliance_members")
        .select("alliance_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (error || !membership) {
        setAllowed(false);
        return;
      }

      // 🔒 Alliance lock — prevent switching
      if (membership.alliance_id !== alliance_id) {
        navigate(/dashboard/, { replace: true });
        return;
      }

      setAllowed(true);
    };

    run();
  }, [alliance_id, navigate]);

  if (allowed === null) {
    return <div style={{ padding: 20 }}>Checking access…</div>;
  }

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
