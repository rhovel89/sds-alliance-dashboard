import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type HQPerms = {
  loading: boolean;
  role: string | null;
  isOwnerGlobal: boolean;
  canEdit: boolean;
};

/**
 * Editing rules:
 * - Global Owner: any user that has alliance_members.role = 'Owner' anywhere can edit ALL alliances
 * - Alliance editor: role in ('Owner','R5','R4') in this alliance can edit
 * - Everyone else: view only
 */
export function useHQPermissions(allianceId: string): HQPerms {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [isOwnerGlobal, setIsOwnerGlobal] = useState(false);

  const upperAlliance = useMemo(() => (allianceId || "").toUpperCase(), [allianceId]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setRole(null);
        setIsOwnerGlobal(false);

        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;

        const user = userRes.user;
        if (!user || !upperAlliance) {
          if (!cancelled) setLoading(false);
          return;
        }

        // 1) Global owner check: has Owner role anywhere
        const { data: anyOwner, error: anyOwnerErr } = await supabase
          .from("alliance_members")
          .select("id")
          .eq("user_id", user.id)
          .eq("role", "Owner")
          .limit(1);

        if (anyOwnerErr) {
          // Don't hard-fail; just log and continue to alliance role check
          console.warn("Global owner check failed:", anyOwnerErr);
        } else if (anyOwner && anyOwner.length > 0) {
          if (!cancelled) setIsOwnerGlobal(true);
        }

        // 2) Alliance-specific role
        const { data: row, error: roleErr } = await supabase
          .from("alliance_members")
          .select("role")
          .eq("user_id", user.id)
          .eq("alliance_id", upperAlliance)
          .maybeSingle();

        if (roleErr) {
          console.warn("Alliance role check failed:", roleErr);
        } else {
          if (!cancelled) setRole(row?.role ?? null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [upperAlliance]);

  const canEdit = useMemo(() => {
    if (isOwnerGlobal) return true;
    return role === "Owner" || role === "R5" || role === "R4";
  }, [isOwnerGlobal, role]);

  return { loading, role, isOwnerGlobal, canEdit };
}
