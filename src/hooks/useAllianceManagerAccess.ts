import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type ManagerAccess = {
  role: string | null;
  isManager: boolean;
  isAppAdmin: boolean;
  loading: boolean;
  error: string | null;
};

function norm(v: any) {
  return String(v ?? "").trim().toLowerCase();
}

export function useAllianceManagerAccess(allianceCode: string | null | undefined): ManagerAccess {
  const code = useMemo(() => String(allianceCode ?? "").trim().toUpperCase(), [allianceCode]);

  const [role, setRole] = useState<string | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [isAppAdmin, setIsAppAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        setRole(null);
        setIsManager(false);
        setIsAppAdmin(false);

        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id ?? null;
        if (!uid) {
          if (!cancelled) setLoading(false);
          return;
        }

        // app admin (optional)
        try {
          const r = await supabase.rpc("is_app_admin", {});
          if (!cancelled) setIsAppAdmin(!!r.data && !r.error);
        } catch {}

        if (!code) {
          if (!cancelled) setLoading(false);
          return;
        }

        // find player id
        const p = await supabase
          .from("players")
          .select("id")
          .eq("auth_user_id", uid)
          .limit(1)
          .maybeSingle();

        const playerId = (p.data as any)?.id ?? null;
        if (!playerId) {
          if (!cancelled) setLoading(false);
          return;
        }

        // find membership role
        const m = await supabase
          .from("player_alliances")
          .select("role")
          .eq("player_id", playerId)
          .eq("alliance_code", code)
          .limit(1)
          .maybeSingle();

        const r = (m.data as any)?.role ?? null;
        const rr = norm(r);

        const mgr = (rr === "owner" || rr === "r4" || rr === "r5");
        if (!cancelled) {
          setRole(r ? String(r) : null);
          setIsManager(mgr);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(String(e?.message ?? e ?? "Unknown error"));
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [code]);

  return { role, isManager, isAppAdmin, loading, error };
}
