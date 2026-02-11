import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const OWNER_DISCORD_ID = "775966588200943616";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/", { replace: true });
        return;
      }

      // 🔐 OWNER OVERRIDE — ALWAYS GO TO SELECT DASHBOARD
      if (user.user_metadata?.provider_id === OWNER_DISCORD_ID) {
        navigate("/owner/select", { replace: true });
        return;
      }

      // 🔎 NORMAL USER FLOW — CHECK ALLIANCE MEMBERSHIP
      const { data: membership } = await supabase
        .from("alliance_members")
        .select("alliance_code")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (membership?.alliance_code) {
        navigate(`/dashboard/${membership.alliance_code}`, { replace: true });
        return;
      }

      // 🧾 FALLBACK → ONBOARDING
      navigate("/onboarding", { replace: true });
    };

    run();
  }, [navigate]);

  return null;
}
