import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useSession } from "../hooks/useSession";
import "../styles/zombie-buttons.css";

export default function LandingPage() {
  const { session, loading } = useSession();
  const [busy, setBusy] = useState(false);

  // Avoid flash while session is loading
  if (loading) return null;

  // ✅ Logged in → dashboard
  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  async function login(provider: "discord" | "google") {
    if (busy) return;
    setBusy(true);

    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo }
    });

    // If we got an error before redirect happens, re-enable buttons
    if (error) {
      console.error("[LandingPage] OAuth login error", error);
      setBusy(false);
    }
  }

  return (
    <div className="zombie-landing">
      <div className="zombie-panel">
        <h1 className="zombie-title">STATE ALLIANCE DASHBOARD</h1>
        <p className="zombie-sub">Enter the Zone… if you survive.</p>

        <div className="zombie-btn-stack">
          <button className="zombie-btn" onClick={() => login("discord")} disabled={busy}>
            🧟 {busy ? "Connecting…" : "Login with Discord"}
          </button>

          <button className="zombie-btn" onClick={() => login("google")} disabled={busy}>
            ☣️ {busy ? "Connecting…" : "Login with Google"}
          </button>
        </div>
      </div>
    </div>
  );
}
