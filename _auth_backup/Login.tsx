import { supabase } from "../lib/supabaseClient";
import "../styles/auth.css";

export default function Login() {
  const redirectTo = `${window.location.origin}/auth/callback`;

  async function loginDiscord() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo },
    });
    if (error) console.error("Discord login error:", error);
  }

  async function loginGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) console.error("Google login error:", error);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Login</h1>
        <p className="muted">Choose a provider to continue.</p>

        <button className="btn" onClick={loginDiscord}>
          Continue with Discord
        </button>

        <button className="btn btn-secondary" onClick={loginGoogle} style={{ marginTop: 12 }}>
          Continue with Google
        </button>

        <p className="muted" style={{ marginTop: 16, fontSize: 12 }}>
          Redirect: {redirectTo}
        </p>
      </div>
    </div>
  );
}
