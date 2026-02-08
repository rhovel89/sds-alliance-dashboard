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

      // Use the full URL exactly as received (recommended for PKCE)
      const { data, error } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      );

      if (cancelled) return;

      if (error) {
        console.error("[AuthCallback] exchange failed", error);
        // Helpful message for the PKCE verifier missing case
        const msg =
          (error as any)?.name === "AuthPKCECodeVerifierMissingError"
            ? "Login could not be completed (PKCE verifier missing). This usually happens if the login was initiated on a different hostname (www vs non-www) or the page was refreshed mid-login. Please return to the home page and try again."
            : error.message;

        setError(msg);
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

      {error && (
        <>
          <pre style={{ color: "#ff6b6b", whiteSpace: "pre-wrap" }}>{error}</pre>
          <button
            onClick={() => navigate("/", { replace: true })}
            style={{
              marginTop: "1rem",
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(154,255,154,0.25)",
              background: "rgba(0,0,0,0.35)",
              color: "#9aff9a",
              cursor: "pointer"
            }}
          >
            Return to Login
          </button>
        </>
      )}
    </div>
  );
}
