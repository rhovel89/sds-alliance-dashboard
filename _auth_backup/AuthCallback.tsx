import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function safe(v: any) {
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

export default function AuthCallback() {
  const [phase, setPhase] = useState("starting");
  const [details, setDetails] = useState<any>({});

  useEffect(() => {
    (async () => {
      const url = window.location.href;

      // show what the browser actually has at runtime (production included)
      const envSnap = {
        origin: window.location.origin,
        href: url,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        supabaseUrl: (import.meta as any).env?.VITE_SUPABASE_URL ?? null,
        hasAnon: !!((import.meta as any).env?.VITE_SUPABASE_ANON_KEY),
      };

      setDetails((d: any) => ({ ...d, envSnap }));
      setPhase("exchanging_code_for_session");

      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(url);
        setDetails((d: any) => ({ ...d, exchange: { data: !!data, hasSession: !!data?.session, error } }));

        if (error) {
          setPhase("FAILED_exchangeCodeForSession");
          return;
        }

        // confirm session
        setPhase("checking_session");
        const { data: s, error: se } = await supabase.auth.getSession();
        setDetails((d: any) => ({
          ...d,
          sessionCheck: { hasSession: !!s?.session, userId: s?.session?.user?.id ?? null, error: se ?? null },
        }));

        if (s?.session) {
          setPhase("SUCCESS_redirecting");
          window.location.replace("/dashboard");
          return;
        }

        setPhase("FAILED_no_session_after_exchange");
      } catch (e: any) {
        setPhase("FAILED_exception");
        setDetails((d: any) => ({ ...d, exception: { message: e?.message ?? String(e), stack: e?.stack ?? null } }));
      }
    })();
  }, []);

  return (
    <div style={{ minHeight: "100vh", padding: 20, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
      <h2>Auth Callback Debug</h2>
      <p><b>Phase:</b> {phase}</p>

      <div style={{ marginTop: 12, padding: 12, border: "1px solid #444", borderRadius: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Details</div>
        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
{safe(details)}
        </pre>
      </div>

      <p style={{ marginTop: 12, opacity: 0.8 }}>
        If this shows <b>hasAnon: false</b> in production, Cloudflare is not injecting env vars into the build.
        If it shows an exchange error (401/No API key/invalid code_verifier), your redirect URL / origin is mismatched.
      </p>
    </div>
  );
}
