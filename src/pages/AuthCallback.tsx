import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    async function completeOAuth() {
      try {
        console.info("[AuthCallback] exchanging OAuth code for session");

        const { data, error } = await supabase.auth.exchangeCodeForSession(
        window.location.origin + window.location.pathname + window.location.search
        );

        if (error) {
          console.error("[AuthCallback] exchange failed", error);
          return;
        }

        if (!data?.session) {
          console.error("[AuthCallback] session missing after exchange");
          return;
        }

        console.info("[AuthCallback] session established", data.session.user.id);

        navigate("/dashboard", { replace: true });
      } catch (err) {
        console.error("[AuthCallback] fatal error", err);
      }
    }

    completeOAuth();
  }, [navigate]);

  return (
    <div style={{ padding: "2rem", color: "#fff" }}>
      <h2>Entering the Zone…</h2>
      <p>Finalizing authentication</p>
    </div>
  );
}
