import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function isAllowedWhenSignedIn(pathname: string) {
  if (pathname === "/") return true;
  if (pathname === "/onboarding") return true;
  if (pathname === "/me") return true;
  if (pathname.startsWith("/me")) return true;
  if (pathname === "/dashboard") return true;         // “My Dashboards”
  if (pathname === "/dashboard/ME") return true;      // legacy
  return false;
}

function isRestricted(pathname: string) {
  // everything else is restricted
  return !isAllowedWhenSignedIn(pathname);
}

function looksLikeUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

async function isAdmin(): Promise<boolean> {
  try {
    const r = await supabase.rpc("is_app_admin");
    return r?.data === true;
  } catch {
    return false;
  }
}

async function hasMembership(uid: string): Promise<boolean> {
  // New model: players + player_alliances
  try {
    let pid: string | null = null;
    const p = await supabase.from("players").select("id").eq("auth_user_id", uid).maybeSingle();
    if (!p.error && p.data?.id) pid = String(p.data.id);

    if (pid) {
      const m = await supabase.from("player_alliances").select("alliance_code").eq("player_id", pid).limit(1);
      if (!m.error && (m.data?.length ?? 0) > 0) return true;
    }
  } catch {}

  // Old model: alliance_members (join by alliance_id uuid)
  try {
    const am = await supabase.from("alliance_members").select("alliance_id").eq("user_id", uid).limit(1);
    if (!am.error && (am.data?.length ?? 0) > 0) return true;
  } catch {}

  return false;
}

export default function OnboardingGate({ children }: { children: ReactNode }) {
  const nav = useNavigate();
  const loc = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setChecking(true);

      const pathname = loc.pathname || "/";
      const allowedSignedIn = isAllowedWhenSignedIn(pathname);
      const restricted = isRestricted(pathname);

      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id ?? null;

      // not signed in => only home/onboarding
      if (!uid) {
        if (!allowedSignedIn) nav("/", { replace: true });
        if (!cancelled) setChecking(false);
        return;
      }

      // signed in users can always reach /me + /dashboard (no more loops)
      if (!restricted) {
        // If they are approved and sitting on onboarding, send them to /me setup
        const admin = await isAdmin();
        const member = admin ? true : await hasMembership(uid);
        if ((admin || member) && pathname === "/onboarding") {
          nav("/me?setup=1", { replace: true });
        }
        if (!cancelled) setChecking(false);
        return;
      }

      // restricted pages require approval
      const admin = await isAdmin();
      const member = admin ? true : await hasMembership(uid);
      const approved = admin || member;

      if (!approved) {
        nav("/onboarding", { replace: true });
      }

      if (!cancelled) setChecking(false);
    })();

    return () => { cancelled = true; };
  }, [loc.pathname, nav]);

  if (checking) return <div style={{ padding: 16 }}>Checking access…</div>;
  return <>{children}</>;
}
