import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function AuthRedirector() {
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const path = loc.pathname || "/";

        // Only auto-redirect from these entry pages.
        const isEntry =
          path === "/" ||
          path === "/dashboard" ||
          path === "/onboarding";

        if (!isEntry) return;

        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id ?? null;

        if (!uid) {
          // Not signed in: keep them on public pages
          return;
        }

        // Admins go to owner dashboard from entry pages.
        let isAdmin = false;
        try {
          const r = await supabase.rpc("is_app_admin");
          isAdmin = !!r.data;
        } catch {}

        if (cancelled) return;

        if (isAdmin) {
          if (path !== "/owner") nav("/owner", { replace: true });
          return;
        }

        // Ensure players row exists (best-effort)
        let pid: string | null = null;
        const p1 = await supabase.from("players").select("id").eq("auth_user_id", uid).maybeSingle();
        if (!p1.error && p1.data?.id) {
          pid = String(p1.data.id);
        } else {
          try {
            const ins = await supabase.from("players").insert({ auth_user_id: uid } as any).select("id").maybeSingle();
            if (!ins.error && ins.data?.id) pid = String(ins.data.id);
          } catch {}
        }

        if (cancelled) return;

        // Check if user has ANY alliance membership
        let hasAlliance = false;
        if (pid) {
          const m = await supabase.from("player_alliances").select("alliance_code").eq("player_id", pid).limit(1);
          if (!m.error && (m.data ?? []).length > 0) hasAlliance = true;
        }

        // Entry page routing:
        // - If they have membership -> /me (fill profile/HQs)
        // - Else -> /onboarding
        const dest = hasAlliance ? "/me" : "/onboarding";
        if (path !== dest) nav(dest, { replace: true });
      } catch (e) {
        // Fail open (do not loop/redirect on errors)
        console.warn("AuthRedirector check failed:", e);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [loc.pathname, nav]);

  return null;
}
