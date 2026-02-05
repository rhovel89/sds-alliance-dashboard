import { supabase } from "../lib/supabaseClient";
import "../styles/auth.css";

export default function LandingPage() {
  const loginDiscord = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "discord"
    });
  };

  const loginGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google"
    });
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h2>Alliance Dashboard</h2>

        <button onClick={loginDiscord}>Continue with Discord</button>
        <button onClick={loginGoogle}>Continue with Google</button>
      </div>
    </div>
  );
}
