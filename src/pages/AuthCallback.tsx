import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const OWNER_ID = "775966588200943616";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session || !session.user) {
        navigate("/", { replace: true });
        return;
      }

      // 🧠 OWNER OVERRIDE — ALWAYS SHOW PICKER
      if (session.user.id === OWNER_ID) {
        navigate("/owner/select", { replace: true });
        return;
      }

      // Normal alliance membership check
      const { data: memberships, error } = await supabase
        .from("alliance_members")
        .select("alliance_id")
        .limit(1);

      if (error || !memberships || memberships.length === 0) {
        navigate("/onboarding", { replace: true });
        return;
      }

      navigate(`/dashboard/${memberships[0].alliance_id}`, { replace: true });
    };

    run();
  }, [navigate]);

  return null;
}
