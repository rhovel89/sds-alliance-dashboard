import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finishAuth() {
      console.info("[AuthCallback] exchanging OAuth code for session");

      const { data, error } =
        await supabase.auth.exchangeCodeForSession(
          window.location.origin +
            window.location.pathname +
            window.location.search
        );

      if (cancelled) return;

      if (error) {
        console.error("[AuthCallback] exchange failed", error);
        setError(error.message);
        return;
      }

      if (!data?.session) {
        console.error("[AuthCallback] no session returned");
        setError("No session returned from Supabase");
        return;
      }

      console.info("[AuthCallback] session OK — redirecting to dashboard");
      navigate("/dashboard", { replace: true });
    }

    finishAuth();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div style={{ color: "#9aff9a", padding: "2rem" }}>
      <h2>Entering the Zone…</h2>
      <p>Completing authentication.</p>
      {error && <pre style={{ color: "red" }}>{error}</pre>}
    </div>
  );
}
