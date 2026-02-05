import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallback() {
  const [msg, setMsg] = useState("ENTERING ZONE…");

  useEffect(() => {
    async function run() {
      try {
        const href = window.location.href;

        console.info("[AuthCallback] href:", href);

        // ✅ Explicitly exchange code for session (prevents race/loop)
        const { data: exData, error: exErr } = await supabase.auth.exchangeCodeForSession(href);
        if (exErr) {
          console.error("[AuthCallback] exchangeCodeForSession error", exErr);
          setMsg("AUTH FAILED (exchange error). Check console.");
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("[AuthCallback] getSession error", error);
          setMsg("AUTH FAILED (session error). Check console.");
          return;
        }

        if (!data.session) {
          console.error("[AuthCallback] No session after exchange.");
          setMsg("AUTH FAILED (no session). Check provider + redirect URLs.");
          return;
        }

        console.info("[AuthCallback] Session OK. Redirecting to /dashboard");
        window.location.replace("/dashboard");
      } catch (e) {
        console.error("[AuthCallback] Fatal error", e);
        setMsg("AUTH FAILED (fatal). Check console.");
      }
    }

    run();
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background: "#000",
      color: "#0f0",
      fontFamily: "monospace"
    }}>
      <h2>{msg}</h2>
    </div>
  );
}
