import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        console.info("[AuthCallback] exchanging OAuth code for session");

        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);

        if (cancelled) return;

        if (error) {
          console.error("[AuthCallback] exchange failed", error);
          setErrorMsg(error.message);
          return;
        }

        if (!data?.session) {
          console.error("[AuthCallback] no session returned");
          setErrorMsg("No session returned from Supabase");
          return;
        }

        console.info("[AuthCallback] session OK — redirecting to dashboard");
        navigate("/dashboard", { replace: true });
      } catch (e: any) {
        if (cancelled) return;
        console.error("[AuthCallback] unexpected error", e);
        setErrorMsg(e?.message ?? String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Completing authentication…</h2>
      {errorMsg ? (
        <pre style={{ whiteSpace: "pre-wrap" }}>{errorMsg}</pre>
      ) : (
        <p>Please wait…</p>
      )}
    </div>
  );
}

