import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function isManagerRole(role?: string | null) {
  const r = String(role ?? "").trim().toLowerCase();
  return ["owner", "r4", "r5"].includes(r);
}

/**
 * Permissions used by HQ Map / Calendar / Manager tools.
 * - canView: user is a member of the alliance (player_alliances)
 * - canEdit: user role is Owner/R4/R5 (or app admin via RPC if available)
 *
 * This intentionally avoids depending on the permissions tables so we don't break
 * when those tables differ across environments.
 */
export function useHQPermissions(allianceCode: string) {
  const code = useMemo(() => upper(allianceCode), [allianceCode]);

  const [loading, setLoading] = useState(true);
  const [canView, setCanView] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setCanView(false);
      setCanEdit(false);
      setRole(null);

      try {
        if (!code) {
          if (!cancelled) setLoading(false);
          return;
        }

        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id ?? null;
        if (!uid) {
          if (!cancelled) setLoading(false);
          return;
        }

        // Best-effort app-admin bypass (if RPC exists)
        try {
          const a = await supabase.rpc("is_app_admin");
          if (typeof a.data === "boolean" && a.data === true) {
            if (!cancelled) {
              setCanView(true);
              setCanEdit(true);
              setRole("app_admin");
              setLoading(false);
            }
            return;
          }
        } catch {}

        // Ensure players row exists
        let playerId: string | null = null;
        const p1 = await supabase.from("players").select("id").eq("auth_user_id", uid).maybeSingle();
        if (!p1.error && p1.data?.id) {
          playerId = String(p1.data.id);
        } else {
          try {
            const ins = await supabase.from("players").insert({ auth_user_id: uid } as any).select("id").maybeSingle();
            if (!ins.error && ins.data?.id) playerId = String(ins.data.id);
          } catch {}
        }

        if (!playerId) {
          if (!cancelled) setLoading(false);
          return;
        }

        // Membership row determines view/edit
        const m = await supabase
          .from("player_alliances")
          .select("role")
          .eq("player_id", playerId)
          .eq("alliance_code", code)
          .maybeSingle();

        if (m.error) throw m.error;

        const r = (m.data?.role ?? null) as any;

        if (!cancelled) {
          const member = !!m.data;
          setRole(r ? String(r) : null);
          setCanView(member);
          setCanEdit(member && isManagerRole(r));
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [code]);

  return { loading, canView, canEdit, role };
}
