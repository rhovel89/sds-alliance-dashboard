import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/", { replace: true });
        return;
      }

      // 1️⃣ CHECK APPROVED ALLIANCE MEMBERSHIP (AUTHORITATIVE)
      const { data: memberships, error: memberError } = await supabase
        .from("alliance_members")
        .select("alliance_id")
        .limit(1);

      if (memberError) {
        console.error("Membership check failed:", memberError);
        navigate("/onboarding", { replace: true });
        return;
      }

      if (memberships && memberships.length > 0) {
        navigate(`/dashboard/${memberships[0].alliance_id}`, { replace: true });
        return;
      }

      // 2️⃣ CHECK PENDING ONBOARDING REQUEST
      const { data: pending, error: pendingError } = await supabase
        .from("onboarding_requests")
        .select("id")
        .eq("status", "pending")
        .limit(1);

      if (pendingError) {
        console.error("Pending check failed:", pendingError);
        navigate("/onboarding", { replace: true });
        return;
      }

      if (pending && pending.length > 0) {
        navigate("/pending-approval", { replace: true });
        return;
      }

      // 3️⃣ BRAND-NEW USER
      navigate("/onboarding", { replace: true });
    };

    run();
  }, [navigate]);

  return null;
}
