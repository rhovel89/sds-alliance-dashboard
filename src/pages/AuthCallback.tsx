import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let done = false;

    // 1) In PKCE + detectSessionInUrl:true mode, Supabase will exchange the code automatically.
    //    So we DO NOT call exchangeCodeForSession here.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (done) return;
      if (session) {
        done = true;
        navigate("/dashboard", { replace: true });
      }
    });

    // 2) Also do an immediate check (in case session already exists by the time this page renders)
    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (done) return;

        if (error) {
          setErrorMsg(error.message);
          return;
        }

        if (data.session) {
          done = true;
          navigate("/dashboard", { replace: true });
        } else {
          setErrorMsg("No session found after OAuth callback. Please try logging in again.");
        }
      } catch (e: any) {
        if (done) return;
        setErrorMsg(e?.message ?? String(e));
      }
    })();

    return () => {
      done = true;
      sub.subscription.unsubscribe();
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
