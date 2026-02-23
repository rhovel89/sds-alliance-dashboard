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

        // Only auto-redirect from ENTRY pages:
        const isEntry = path === "/" || path === "/dashboard" || path === "/onboarding";
        if (!isEntry) return;

        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id ?? null;
        if (!uid) return;

        // Admins -> /owner from entry pages
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

        // Ensure players row exists
        let pid: string | null = null;
        const p1 = await supabase.from("players").select("id").eq("auth_user_id", uid).maybeSingle();
        if (!p1.error && p1.data?.id) pid = String(p1.data.id);
        if (!pid) {
          try {
            const ins = await supabase.from("players").insert({ auth_user_id: uid } as any).select("id").maybeSingle();
            if (!ins.error && ins.data?.id) pid = String(ins.data.id);
          } catch {}
        }

        if (cancelled) return;

        // If they have any membership -> /me, else -> /onboarding
        let hasAlliance = false;
        if (pid) {
          const m = await supabase.from("player_alliances").select("alliance_code").eq("player_id", pid).limit(1);
          if (!m.error && (m.data ?? []).length > 0) hasAlliance = true;
        }

        const dest = hasAlliance ? "/me" : "/onboarding";
        if (path !== dest) nav(dest, { replace: true });
      } catch (e) {
        console.warn("AuthRedirector check failed:", e);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [loc.pathname, nav]);

  return null;
}

