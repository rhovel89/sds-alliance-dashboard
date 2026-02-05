import { supabase } from "../lib/supabaseClient";

const getRedirectURL = () => {
  return window.location.origin + "/auth/callback";
};

export default function Login() {
  const signInWithDiscord = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: getRedirectURL(),
      },
    });
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getRedirectURL(),
      },
    });
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Sign in</h1>
      <p>Access the State 789 Alliance Dashboard</p>

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button onClick={signInWithDiscord}>Sign in with Discord</button>
        <button onClick={signInWithGoogle}>Sign in with Google</button>
      </div>
    </div>
  );
}
