import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function isPublicPath(pathname: string) {
  // Public / auth routes should never be blocked by onboarding gate
  if (pathname === "/") return true;
  if (pathname === "/login") return true;

  // In THIS app, /dashboard is used for auth callback in some setups.
  // Keeping it public prevents redirect loops during sign-in.
  if (pathname === "/dashboard") return true;

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
  // 1) Old model: alliance_members.user_id
  try {
    const r = await supabase
      .from("alliance_members")
      .select("alliance_id")
      .eq("user_id", uid)
      .limit(1);

    if (!r.error && (r.data?.length ?? 0) > 0) return true;
  } catch {}

  // 2) New model: players + player_alliances
  try {
    let pid: string | null = null;

    const p = await supabase
      .from("players")
      .select("id")
      .eq("auth_user_id", uid)
      .maybeSingle();

    if (!p.error && p.data?.id) pid = String(p.data.id);

    // If missing, best-effort create player row (prevents gate dead-lock)
    if (!pid) {
      const ins = await supabase
        .from("players")
        .insert({ auth_user_id: uid } as any)
        .select("id")
        .maybeSingle();

      if (!ins.error && ins.data?.id) pid = String(ins.data.id);
    }

    if (pid) {
      const m = await supabase
        .from("player_alliances")
        .select("alliance_code")
        .eq("player_id", pid)
        .limit(1);

      if (!m.error && (m.data?.length ?? 0) > 0) return true;
    }
  } catch {}

  return false;
}

async function bestEffortApprovedByRequest(uid: string): Promise<boolean | null> {
  // Optional: if you have an access request table, honor it.
  // If table/columns don't exist, return null and we fall back to other checks.
  const tryTable = async (table: string) => {
    try {
      const r = await supabase
        .from(table)
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (r.error) return null;
      const row: any = r.data;
      if (!row) return null;

      if (row.approved === true) return true;
      if (row.status && String(row.status).toLowerCase() === "approved") return true;
      if (row.approved_at) return true;

      // explicit deny
      if (row.status && ["denied", "rejected"].includes(String(row.status).toLowerCase())) return false;

      return null;
    } catch {
      return null;
    }
  };

  // common candidates (safe to attempt)
  const a = await tryTable("access_requests");
  if (a !== null) return a;

  const b = await tryTable("owner_access_requests");
  if (b !== null) return b;

  return null;
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

        // Not signed in: allow public pages; otherwise bounce to home
        if (!uid) {
          if (!publicOk) nav("/", { replace: true });
          if (!cancelled) {
            setAllowed(publicOk);
            setChecking(false);
          }
          return;
        }

        const isAdmin = await bestEffortIsAdmin();
        const hasMembership = isAdmin ? true : await bestEffortHasAllianceMembership(uid);
        const approvedByRequest = isAdmin || hasMembership ? true : (await bestEffortApprovedByRequest(uid));

        // If we can't determine request approval, don't block people (fail-open)
        const approved = isAdmin || hasMembership || approvedByRequest === true || approvedByRequest === null;

        if (approved) {
          // Never keep an approved user stuck on onboarding
          if (pathname === "/onboarding") {
            nav("/me", { replace: true });
          }
          if (!cancelled) {
            setAllowed(true);
            setChecking(false);
          }
          return;
        }

        // Not approved: only allow public routes, otherwise force onboarding
        if (!publicOk) {
          nav("/onboarding", { replace: true });
          if (!cancelled) setAllowed(false);
        } else {
          if (!cancelled) setAllowed(true);
        }
      } catch {
        // Fail-open so users don't get stuck due to transient errors
        if (!cancelled) setAllowed(true);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loc.pathname, nav]);

  if (checking) return <div style={{ padding: 16 }}>Checking access…</div>;
  if (!allowed) return null;
  return <>{children}</>;
}
