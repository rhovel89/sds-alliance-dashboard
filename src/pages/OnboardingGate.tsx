import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Onboarding from "./Onboarding";

/**
 * OnboardingGate:
 * - If user is already assigned to an alliance, skip onboarding and go to /me
 * - Otherwise render the existing Onboarding page unchanged
 *
 * Detection is best-effort and safe:
 *   - player_alliances rows for the player's id, OR
 *   - alliance_members rows for auth.uid()
 */
export default function OnboardingGate() {
  const nav = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: uRes } = await supabase.auth.getUser();
        const uid = uRes?.user?.id ?? null;

        if (!uid) {
          if (!cancelled) setChecking(false);
          return;
        }

        // 1) Try: players(auth_user_id) -> player_alliances(player_id)
        try {
          const { data: player, error: pErr } = await supabase
            .from("players")
            .select("id")
            .eq("auth_user_id", uid)
            .maybeSingle();

          if (!pErr && player?.id) {
            const { data: pa, error: paErr } = await supabase
              .from("player_alliances")
              .select("alliance_code")
              .eq("player_id", player.id)
              .limit(1);

            if (!paErr && (pa?.length ?? 0) > 0) {
              nav("/me", { replace: true });
              return;
            }
          }
        } catch {}

        // 2) Fallback: alliance_members for this user
        try {
          const { data: am, error: amErr } = await supabase
            .from("alliance_members")
            .select("alliance_id")
            .eq("user_id", uid)
            .limit(1);

          if (!amErr && (am?.length ?? 0) > 0) {
            nav("/me", { replace: true });
            return;
          }
        } catch {}

      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => { cancelled = true; };
  }, [nav]);

  if (checking) return <div style={{ padding: 16 }}>Loading…</div>;
  return <Onboarding />;
}
