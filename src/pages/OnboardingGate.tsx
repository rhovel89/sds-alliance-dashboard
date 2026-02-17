import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Onboarding from "./Onboarding";

export default function OnboardingGate() {
  const nav = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: ures } = await supabase.auth.getUser();
        const uid = ures?.user?.id ?? null;

        // Not signed in -> show onboarding (it usually contains the login UI / flow)
        if (!uid) {
          if (!cancelled) setChecking(false);
          return;
        }

        const { data: p, error: pErr } = await supabase
          .from("players")
          .select("id")
          .eq("auth_user_id", uid)
          .maybeSingle();

        if (pErr) throw pErr;

        const pid = (p as any)?.id ?? null;
        if (!pid) {
          if (!cancelled) setChecking(false);
          return;
        }

        const { data: pa, error: paErr } = await supabase
          .from("player_alliances")
          .select("alliance_code")
          .eq("player_id", pid)
          .limit(1);

        if (paErr) throw paErr;

        const hasAlliance = Array.isArray(pa) && pa.length > 0;

        // If already assigned, never show onboarding again
        if (hasAlliance) {
          nav("/me", { replace: true });
          return;
        }

        if (!cancelled) setChecking(false);
      } catch {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [nav]);

  if (checking) return <div style={{ padding: 16 }}>Checking your status…</div>;
  return <Onboarding />;
}
