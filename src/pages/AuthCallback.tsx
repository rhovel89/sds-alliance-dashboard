import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [lsDump, setLsDump] = useState<string[]>([]);

  const originInfo = useMemo(() => {
    return {
      href: window.location.href,
      origin: window.location.origin,
      host: window.location.host
    };
  }, []);

  useEffect(() => {
    // Dump localStorage keys for debugging PKCE
    try {
      const keys = Object.keys(window.localStorage || {}).sort();
      const interesting = keys.filter((k) =>
        /supabase|sb-|auth|pkce|verifier|code/i.test(k)
      );
      setLsDump(interesting.length ? interesting : keys.slice(0, 50));
    } catch (e) {
      setLsDump(["<localStorage not accessible>"]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function finishAuth() {
      console.info(\"[AuthCallback] exchanging OAuth code for session\");

      const { data, error } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      );

      if (cancelled) return;

      if (error) {
        console.error(\"[AuthCallback] exchange failed\", error);
        setError(error.message);
        return;
      }

      if (!data?.session) {
        console.error(\"[AuthCallback] no session returned\");
        setError(\"No session returned from Supabase\");
        return;
      }

      console.info(\"[AuthCallback] session OK — redirecting to dashboard\");
      navigate(\"/dashboard\", { replace: true });
    }

    finishAuth();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div style={{ color: \"#9aff9a\", padding: \"2rem\" }}>
      <h2>Entering the Zone…</h2>
      <p>Completing authentication.</p>

      <div style={{ marginTop: 16, padding: 12, border: \"1px solid rgba(154,255,154,0.25)\", borderRadius: 10, background: \"rgba(0,0,0,0.35)\" }}>
        <div><b>Host:</b> {originInfo.host}</div>
        <div style={{ marginTop: 6 }}><b>URL:</b> <span style={{ wordBreak: \"break-all\" }}>{originInfo.href}</span></div>
        <div style={{ marginTop: 10 }}><b>localStorage keys (filtered):</b></div>
        <pre style={{ whiteSpace: \"pre-wrap\", color: \"#c9ffc9\" }}>{lsDump.join(\"\\n\")}</pre>
      </div>

      {error && (
        <pre style={{ color: \"#ff6b6b\", marginTop: 16, whiteSpace: \"pre-wrap\" }}>
          {error}
        </pre>
      )}
    </div>
  );
}
