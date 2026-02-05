// src/pages/AuthCallback.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (!code) {
        navigate("/login", { replace: true });
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("OAuth exchange failed:", error);
        navigate("/login", { replace: true });
        return;
      }

      // ✅ CLEAN URL
      window.history.replaceState({}, document.title, "/dashboard");

      navigate("/dashboard", { replace: true });
    };

    run();
  }, [navigate]);

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      Finalizing sign-in…
    </div>
  );
}
