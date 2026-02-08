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
        // With detectSessionInUrl: true, Supabase exchanges automatically.
        // We just wait for the session to exist.
        const { data: initial } = await supabase.auth.getSession();
        if (cancelled) return;

        if (initial.session) {
          navigate("/dashboard", { replace: true });
          return;
        }

        // If not ready yet, listen for the sign-in event
        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
          if (cancelled) return;
          if (session) navigate("/dashboard", { replace: true });
        });

        // If nothing happens shortly, show a helpful error
        setTimeout(async () => {
          if (cancelled) return;
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            setErrorMsg("Auth session not detected. Try logging in again from the home page.");
          }
        }, 1500);

        return () => sub.subscription.unsubscribe();
      } catch (e: any) {
        if (cancelled) return;
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
      {errorMsg ? <pre style={{ whiteSpace: "pre-wrap" }}>{errorMsg}</pre> : null}
    </div>
  );
}
