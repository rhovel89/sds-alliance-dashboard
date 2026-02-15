import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

function shouldRedirect(pathname: string) {
  if (pathname === "/") return true;
  if (pathname.startsWith("/login")) return true;
  if (pathname.startsWith("/auth")) return true;
  return false;
}

export default function AuthRedirector() {
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    let alive = true;

    // If already signed in and sitting on a landing/callback URL, redirect.
    (async () => {
      const u = await supabase.auth.getUser();
      if (!alive) return;
      if (u.data.user && shouldRedirect(loc.pathname)) {
        nav("/dashboard", { replace: true });
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (!alive) return;

      if (event === "SIGNED_IN") {
        if (shouldRedirect(loc.pathname)) {
          nav("/dashboard", { replace: true });
        }
      }
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, [loc.pathname, nav]);

  return null;
}
