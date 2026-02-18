import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  if (pathname === "/login") return true;
  if (pathname === "/dashboard") return true; // auth callback in some setups
  if (pathname.startsWith("/auth")) return true;
  if (pathname === "/onboarding") return true;
  return false;
}

async function bestEffortIsAdmin(): Promise<boolean> {
  try {
    const res = await supabase.rpc("is_app_admin");
    return res?.data === true;
  } catch {
    return false;
  }
}

async function bestEffortHasAllianceMembership(uid: string): Promise<boolean> {
  // Old model: alliance_members.user_id
  try {
    const r = await supabase.from("alliance_members").select("alliance_id").eq("user_id", uid).limit(1);
    if (!r.error && (r.data?.length ?? 0) > 0) return true;
  } catch {}

  // New model: players + player_alliances
  try {
    let pid: string | null = null;

    const p = await supabase.from("players").select("id").eq("auth_user_id", uid).maybeSingle();
    if (!p.error && p.data?.id) pid = String(p.data.id);

    if (!pid) {
      const ins = await supabase.from("players").insert({ auth_user_id: uid } as any).select("id").maybeSingle();
      if (!ins.error && ins.data?.id) pid = String(ins.data.id);
    }

    if (pid) {
      const m = await supabase.from("player_alliances").select("alliance_code").eq("player_id", pid).limit(1);
      if (!m.error && (m.data?.length ?? 0) > 0) return true;
    }
  } catch {}

  return false;
}

export default function OnboardingGate({ children }: { children: ReactNode }) {
  const nav = useNavigate();
  const loc = useLocation();

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setChecking(true);
      setAllowed(true);

      const pathname = loc.pathname || "/";
      const publicOk = isPublicPath(pathname);

      try {
        const { data } = await supabase.auth.getUser();
        const uid = data?.user?.id ?? null;

        if (!uid) {
          if (!publicOk) nav("/", { replace: true });
          if (!cancelled) { setAllowed(publicOk); setChecking(false); }
          return;
        }

        const isAdmin = await bestEffortIsAdmin();
        const hasMembership = isAdmin ? true : await bestEffortHasAllianceMembership(uid);

        // APPROVED if admin OR has any membership
        const approved = isAdmin || hasMembership;

        if (approved) {
          // ✅ Approved users should land on Profile/HQs
          if (pathname === "/onboarding") nav("/me?setup=1", { replace: true });
          if (!cancelled) { setAllowed(true); setChecking(false); }
          return;
        }

        // Not approved: allow only public pages, else send to onboarding
        if (!publicOk) {
          nav("/onboarding", { replace: true });
          if (!cancelled) setAllowed(false);
        } else {
          if (!cancelled) setAllowed(true);
        }
      } catch {
        // fail-open
        if (!cancelled) setAllowed(true);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => { cancelled = true; };
  }, [loc.pathname, nav]);

  if (checking) return <div style={{ padding: 16 }}>Checking access…</div>;
  if (!allowed) return null;
  return <>{children}</>;
}
