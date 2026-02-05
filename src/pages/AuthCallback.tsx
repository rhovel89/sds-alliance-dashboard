import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const finalize = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Auth callback error:", error);
        navigate("/login", { replace: true });
        return;
      }

      if (!data.session) {
        console.error("No session after callback");
        navigate("/login", { replace: true });
        return;
      }

      // 🔥 CLEAN URL (remove ?code=...)
      window.history.replaceState({}, document.title, "/dashboard");

      navigate("/dashboard", { replace: true });
    };

    finalize();
  }, [navigate]);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div>Finalizing sign-in…</div>
    </div>
  );
}
