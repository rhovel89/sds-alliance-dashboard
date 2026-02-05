import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useSession } from "../hooks/useSession";
import "../styles/zombie-buttons.css";

export default function LandingPage() {
  const { session } = useSession();

  // ✅ If already logged in, go dashboard
  // ✅ CRITICAL: If OAuth returns to "/" with ?code=... (your current problem),
  // immediately forward the same query params to /auth/callback
  const search = window.location.search || "";
  const hash = window.location.hash || "";

  if (search.includes("code=") || search.includes("error=") || hash.includes("access_token=")) {
    return <Navigate to={`/auth/callback${search || hash}`} replace />;
  }

  async function loginDiscord() {
    const redirectTo = `${window.location.origin}/auth/callback`;
    console.info("[LandingPage] Discord login redirectTo:", redirectTo);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo }
    });

    if (error) console.error("[LandingPage] Discord login error", error);
  }

  async function loginGoogle() {
    const redirectTo = `${window.location.origin}/auth/callback`;
    console.info("[LandingPage] Google login redirectTo:", redirectTo);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
    });

    if (error) console.error("[LandingPage] Google login error", error);
  }

  return (
    <div className="zombie-landing">
      <div className="zombie-panel">
        <h1 className="zombie-title">STATE ALLIANCE DASHBOARD</h1>
        <p className="zombie-sub">Enter the Zone… if you survive.</p>

        <div className="zombie-btn-stack">
          <button className="zombie-btn" onClick={loginDiscord}>
            🧟 Login with Discord
          </button>

          <button className="zombie-btn" onClick={loginGoogle}>
            ☣️ Login with Google
          </button>
        </div>
      </div>
    </div>
  );
}

