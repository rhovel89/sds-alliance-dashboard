import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const OWNER_ID = "775966588200943616";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/", { replace: true });
        return;
      }

      if (user.id === OWNER_ID) {
        navigate("/select-dashboard", { replace: true });
        return;
      }

      const { data: membership } = await supabase
        .from("alliance_members")
        .select("alliance_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (membership?.alliance_id) {
        navigate(`/dashboard/${membership.alliance_id}`, { replace: true });
        return;
      }

      navigate("/onboarding", { replace: true });
    };

    run();
  }, [navigate]);

  return null;
}
