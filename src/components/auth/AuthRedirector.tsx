import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

/**
 * IMPORTANT:
 * Do NOT redirect on every page — that causes route loops (everything -> /me).
 * We ONLY redirect from "/" to "/me" if the user is already signed in.
 */
export default function AuthRedirector() {
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // Only act on the public landing page
      if (loc.pathname !== "/") return;

      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id ?? null;
      if (cancelled) return;

      if (uid) {
        nav("/me", { replace: true });
      }
    }

    run();
    return () => { cancelled = true; };
  }, [loc.pathname, nav]);

  return null;
}
