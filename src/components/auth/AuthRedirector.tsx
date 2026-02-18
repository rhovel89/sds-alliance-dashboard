import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function AuthRedirector() {
  const nav = useNavigate();
  const [msg, setMsg] = useState("Checking access…");

  useEffect(() => {
    let cancelled = false;

    async function go() {
      try {
        const { data } = await supabase.auth.getUser();
        const uid = data?.user?.id ?? null;

        if (!uid) {
          if (!cancelled) nav("/", { replace: true });
          return;
        }

        // Ensure players row exists
        let pid: string | null = null;
        const p1 = await supabase.from("players").select("id").eq("auth_user_id", uid).maybeSingle();
        if (!p1.error && p1.data?.id) {
          pid = String(p1.data.id);
        } else {
          const ins = await supabase
            .from("players")
            .insert({ auth_user_id: uid } as any)
            .select("id")
            .maybeSingle();
          if (!ins.error && ins.data?.id) pid = String(ins.data.id);
        }

        if (!pid) {
          if (!cancelled) nav("/onboarding", { replace: true });
          return;
        }

        // If assigned to at least 1 alliance -> go to /me
        setMsg("Loading your dashboard…");
        const m = await supabase
          .from("player_alliances")
          .select("alliance_code", { head: true, count: "exact" })
          .eq("player_id", pid);

        const count = m.count ?? 0;
        if (!cancelled) {
          if (count > 0) nav("/me", { replace: true });
          else nav("/onboarding", { replace: true });
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) nav("/onboarding", { replace: true });
      }
    }

    go();
    return () => {
      cancelled = true;
    };
  }, [nav]);

  return <div style={{ padding: 16 }}>{msg}</div>;
}
