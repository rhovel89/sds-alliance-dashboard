import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function AuthLandingPage() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data?.session) {
        setMsg("You're already signed in. Redirecting…");
        nav("/onboarding", { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [nav]);

  const signIn = async (provider: "google" | "discord") => {
    setBusy(true);
    setMsg("");
    const redirectTo = `${window.location.origin}/onboarding`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) {
      setMsg(error.message);
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ marginTop: 10 }}>State Alliance Dashboard</h1>
      <p style={{ opacity: 0.85, lineHeight: 1.4 }}>Sign in to continue.</p>

      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        <button disabled={busy} onClick={() => signIn("google")} style={{ padding: "10px 12px", borderRadius: 10 }}>
          Continue with Google
        </button>
        <button disabled={busy} onClick={() => signIn("discord")} style={{ padding: "10px 12px", borderRadius: 10 }}>
          Continue with Discord
        </button>
      </div>

      {msg ? (
        <div style={{ marginTop: 14, padding: 10, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10 }}>
          {msg}
        </div>
      ) : null}

      <div style={{ marginTop: 14, fontSize: 12, opacity: 0.75 }}>
        After signing in, you'll be taken to onboarding.
      </div>
    </div>
  );
}
