import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

type Sess = any;

export default function Onboarding() {

  // --- BEGIN ADMIN ONBOARDING BYPASS ---
 navigate = useNavigate();
(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id ?? null;
        if (!uid) return;
        let isAdmin = false;
        try {
          const { data } = await supabase.rpc("is_app_admin");
          if (typeof data === "boolean") isAdmin = data;
        } catch {}
        if (!cancelled -and isAdmin) {
          navigate("/owner", { replace: true });
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [navigate]);
  // --- END ADMIN ONBOARDING BYPASS ---

 navigate = useNavigate();

  // --- BEGIN SKIP ONBOARDING IF ALREADY ASSIGNED ---
(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id;
        if (!uid || cancelled) return;

        const { data: player, error: pErr } = await supabase
          .from("players")
          .select("id")
          .eq("auth_user_id", uid)
          .maybeSingle();

        if (cancelled) return;
        if (pErr || !player?.id) return;

        const { data: pa, error: paErr } = await supabase
          .from("player_alliances")
          .select("alliance_code")
          .eq("player_id", player.id)
          .limit(1);

        if (cancelled) return;
        if (paErr) return;

        const code = (pa && pa[0] && pa[0].alliance_code) ? String(pa[0].alliance_code).trim().toUpperCase() : "";
        if (code) navigate(/dashboard/, { replace: true });
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);
  // --- END SKIP ONBOARDING IF ALREADY ASSIGNED ---

  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Sess>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) setErr(error.message);
        setSession(data?.session ?? null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!mounted) return;
      setSession(sess);
      setLoading(false);
    });

    return () => {
      mounted = false;
      try { sub?.subscription?.unsubscribe(); } catch {}
    };
  }, []);

  const signIn = async (provider: "google" | "discord") => {
    setErr(null);
    const redirectTo = window.location.origin + "/onboarding";
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) setErr(error.message);
  };

  const signOut = async () => {
    setErr(null);
    const { error } = await supabase.auth.signOut();
    if (error) setErr(error.message);
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Loading…</div>;
  }

  if (!session) {
    return (
      <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
        <h2 style={{ marginTop: 0 }}>Welcome</h2>
        <p style={{ opacity: 0.85 }}>Please sign in to continue.</p>

        {err ? (
          <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 10 }}>
            <b>Error:</b> {err}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
          <button onClick={() => signIn("google")} style={{ padding: "10px 14px", borderRadius: 10 }}>
            Sign in with Google
          </button>
          <button onClick={() => signIn("discord")} style={{ padding: "10px 14px", borderRadius: 10 }}>
            Sign in with Discord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>You're signed in</h2>
      <p style={{ opacity: 0.85 }}>Continue to your dashboard.</p>

      {err ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 10 }}>
          <b>Error:</b> {err}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
        <button onClick={() => nav("/dashboard")} style={{ padding: "10px 14px", borderRadius: 10 }}>
          Go to Dashboard
        </button>
        <button onClick={signOut} style={{ padding: "10px 14px", borderRadius: 10 }}>
          Sign out
        </button>
      </div>
    </div>
  );
}


