import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/", { replace: true });
        return;
      }

      try {
        const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
          supabase.rpc("is_app_admin"),
          supabase.rpc("is_dashboard_owner"),
        ]);

        if (isAdmin === true || isOwner === true) {
          navigate("/owner/select", { replace: true });
          return;
        }
      } catch {
        // fall through to normal user flow
      }

      const { data: membership } = await supabase
        .from("alliance_members")
        .select("alliance_code")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (membership?.alliance_code) {
        navigate(`/dashboard/${membership.alliance_code}`, { replace: true });
        return;
      }

      navigate("/onboarding", { replace: true });
    };

    void run();
  }, [navigate]);

  return null;
}
