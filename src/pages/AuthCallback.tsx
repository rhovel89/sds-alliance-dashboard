import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const exchange = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (!code) {
        navigate("/login", { replace: true });
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Auth exchange failed:", error.message);
        navigate("/login", { replace: true });
        return;
      }

      navigate("/dashboard", { replace: true });
    };

    exchange();
  }, [navigate]);

  return <div>Completing sign in…</div>;
}
