import { supabase } from "../lib/supabaseClient";

export default function LandingPage() {
  const loginWithDiscord = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: window.location.origin + "/auth/callback"
      }
    });
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div>
        <h1>State Alliance Dashboard</h1>
        <button onClick={loginWithDiscord}>Login with Discord</button>
      </div>
    </div>
  );
}
