import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Result = {
  loading: boolean;
  signedIn: boolean;
  userId: string;
  canCreateGuides: boolean;
  canManageAllGuides: boolean;
  reason: string;
};

function lower(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

export function useAllianceGuideToolAccess(allianceCode: string): Result {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [userId, setUserId] = useState("");
  const [canCreateGuides, setCanCreateGuides] = useState(false);
  const [canManageAllGuides, setCanManageAllGuides] = useState(false);
  const [reason, setReason] = useState("Checking access...");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setSignedIn(false);
      setUserId("");
      setCanCreateGuides(false);
      setCanManageAllGuides(false);
      setReason("Checking access...");

      try {
        const code = String(allianceCode || "").trim().toUpperCase();
        if (!code) {
          if (!cancelled) {
            setReason("Missing alliance code.");
            setLoading(false);
          }
          return;
        }

        const u = await supabase.auth.getUser();
        const uid = u.data.user?.id ?? "";

        if (!uid) {
          if (!cancelled) {
            setSignedIn(false);
            setUserId("");
            setCanCreateGuides(false);
            setCanManageAllGuides(false);
            setReason("Sign in required.");
            setLoading(false);
          }
          return;
        }

        // Base rule: any signed-in player can create/manage their own guides
        setSignedIn(true);
        setUserId(uid);
        setCanCreateGuides(true);

        // App-wide elevated roles
        try {
          const admin = await supabase.rpc("is_app_admin");
          if (admin.data === true) {
            if (!cancelled) {
              setCanManageAllGuides(true);
              setReason("App admin");
              setLoading(false);
            }
            return;
          }
        } catch {}

        try {
          const owner = await supabase.rpc("is_dashboard_owner");
          if (owner.data === true) {
            if (!cancelled) {
              setCanManageAllGuides(true);
              setReason("Dashboard owner");
              setLoading(false);
            }
            return;
          }
        } catch {}

        // Resolve player_id
        let playerId = "";
        try {
          const link = await supabase
            .from("player_auth_links")
            .select("player_id")
            .eq("user_id", uid)
            .limit(1)
            .maybeSingle();

          playerId = String((link.data as any)?.player_id || "").trim();
        } catch {}

        // Alliance role check: owner / r5
        if (playerId) {
          try {
            const pa = await supabase
              .from("player_alliances")
              .select("role")
              .eq("player_id", playerId)
              .eq("alliance_code", code);

            const roles = (pa.data || []).map((x: any) => lower(x?.role));
            if (roles.includes("owner") || roles.includes("r5")) {
              if (!cancelled) {
                setCanManageAllGuides(true);
                setReason("Alliance owner/R5");
                setLoading(false);
              }
              return;
            }
          } catch {}
        }

        // Explicit grants
        let granted = false;

        try {
          const byUser = await supabase
            .from("alliance_access_grants")
            .select("*")
            .eq("alliance_code", code)
            .eq("user_id", uid);

          const rows = (byUser.data || []) as any[];
          if (rows.some((r) => r?.can_manage_guides === true || r?.can_post_alerts === true)) {
            granted = true;
          }
        } catch {}

        if (!granted && playerId) {
          try {
            const byPlayer = await supabase
              .from("alliance_access_grants")
              .select("*")
              .eq("alliance_code", code)
              .eq("player_id", playerId);

            const rows = (byPlayer.data || []) as any[];
            if (rows.some((r) => r?.can_manage_guides === true || r?.can_post_alerts === true)) {
              granted = true;
            }
          } catch {}
        }

        if (!cancelled) {
          setCanManageAllGuides(granted);
          setReason(granted ? "Explicitly granted" : "Own guides only");
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setSignedIn(false);
          setUserId("");
          setCanCreateGuides(false);
          setCanManageAllGuides(false);
          setReason(String(e?.message || e || "Access check failed"));
          setLoading(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [allianceCode]);

  return {
    loading,
    signedIn,
    userId,
    canCreateGuides,
    canManageAllGuides,
    reason,
  };
}
