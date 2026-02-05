import "../styles/zombie-landing.css";
import { supabase } from "../lib/supabaseClient";

export default function LandingPage() {
  async function loginDiscord() {
    await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: window.location.origin + "/auth/callback" },
    });
  }

  async function loginGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth/callback" },
    });
  }

  return (
    <div className="zombie-bg">
      <div className="blood-drip" />
      <div className="fog" />
      <div className="vhs-overlay" />

      <div className="login-panel glitch" data-text="STATE 789">
        <h1>STATE 789</h1>

        <Button className="login-btn" onClick={loginDiscord} className="zombie-btn" className="zombie-btn">
          🧟 Login with Discord
        </button>

        <Button className="login-btn" onClick={loginGoogle} className="zombie-btn" className="zombie-btn">
          ☣️ Login with Google
        </button>
      </div>
    </div>
  );
}

import '../styles/zombie-buttons.css';

