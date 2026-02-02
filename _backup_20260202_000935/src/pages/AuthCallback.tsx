import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    async function finalizeOAuth() {
      const { error } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      );

      if (error) {
        console.error("OAuth finalize error:", error.message);
      }

      navigate("/", { replace: true });
    }

    finalizeOAuth();
  }, [navigate]);

  return (
    <div style={{ padding: 48, textAlign: "center" }}>
      <h2>Finalizing login…</h2>
    </div>
  );
}
