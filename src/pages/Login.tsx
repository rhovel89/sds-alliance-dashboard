import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const login = async (provider: "discord" | "google") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  };

  return (
    <div className="zombie-landing">
      <div className="zombie-panel">
        <h1 className="zombie-title">🧟 State 789 Alliance Command</h1>

        <button className="zombie-btn" onClick={() => login("discord")}>
          Login with Discord
        </button>

        <button className="zombie-btn" onClick={() => login("google")}>
          Login with Google
        </button>
      </div>
    </div>
  );
}



