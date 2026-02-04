import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { setPageTitle } from "../utils/pageTitle";
import "../styles/auth.css";

export default function LandingPage() {
  useEffect(() => {
    setPageTitle("Welcome");
  }, []);

  const loginDiscord = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: window.location.origin + "/auth/callback"
      }
    });
  };

  const loginGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/auth/callback"
      }
    });
  };

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <div className="auth-title">Alliance Dashboard</div>
        <div className="auth-subtitle">
          Sign in to access your alliance tools
        </div>

        <div className="auth-actions">
          {/* DISCORD */}
          <button
            onClick={loginDiscord}
            style={{
              width: "100%",
              padding: "14px 18px",
              marginBottom: 12,
              borderRadius: 8,
              border: "none",
              background: "#5865F2",
              color: "#fff",
              fontSize: 16,
              cursor: "pointer"
            }}
          >
            Continue with Discord
          </button>

          {/* GOOGLE */}
          <button
            onClick={loginGoogle}
            style={{
              width: "100%",
              padding: "14px 18px",
              borderRadius: 8,
              border: "none",
              background: "#ffffff",
              color: "#000",
              fontSize: 16,
              cursor: "pointer"
            }}
          >
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}
