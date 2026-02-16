import { supabase } from "../lib/supabase";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsAppAdmin } from "../hooks/useIsAppAdmin";

export default function LandingRedirectPage() {
  const nav = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAppAdmin();
  const [status, setStatus] = useState<"loading" | "signed_out">("loading");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Wait for admin check to finish (it relies on session)
      if (adminLoading) return;

      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;

      // Not signed in: don't loop; show a simple message
      if (!user) {
        if (!cancelled) setStatus("signed_out");
        return;
      }

      // Admin/Owner: keep existing behavior
      if (isAdmin) {
        nav("/dashboard", { replace: true });
        return;
      }

      // Player: approved if they have player_auth_links + at least one player_alliances row
      try {
        const { data: link, error: linkErr } = await supabase
          .from("player_auth_links")
          .select("player_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (linkErr || !link?.player_id) {
          nav("/onboarding", { replace: true });
          return;
        }

        const { data: memberships, error: memErr } = await supabase
          .from("player_alliances")
          .select("id")
          .eq("player_id", link.player_id)
          .limit(1);

        if (memErr || !memberships || memberships.length === 0) {
          nav("/onboarding", { replace: true });
          return;
        }

        nav("/me", { replace: true });
      } catch {
        nav("/onboarding", { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [adminLoading, isAdmin, nav]);

  if (status === "signed_out") {
    return (
      <div style={{ padding: 24 }}>
        <h2>Welcome</h2>
        <p>Please sign in to continue.</p>
      </div>
    );
  }

  return <div style={{ padding: 24 }}>Loading…</div>;
}