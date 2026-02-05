import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Completing authentication…");

  useEffect(() => {
    let cancelled = false;

    async function finishAuth() {
      try {
        console.info("[AuthCallback] handling OAuth response");

        // IMPORTANT: this finalizes the session
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("[AuthCallback] getSession error", error);
          setStatus("Authentication failed.");
          return;
        }

        if (!data.session) {
          console.warn("[AuthCallback] No session yet, retrying…");
          setTimeout(finishAuth, 300);
          return;
        }

        console.info("[AuthCallback] session ready", data.session.user?.id);

        if (!cancelled) {
          navigate("/dashboard", { replace: true });
        }
      } catch (e) {
        console.error("[AuthCallback] unexpected error", e);
        setStatus("Authentication error.");
      }
    }

    finishAuth();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div style={{ padding: "2rem", color: "#fff" }}>
      <h2>Entering the Zone…</h2>
      <p>{status}</p>
    </div>
  );
}
