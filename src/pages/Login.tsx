import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const loginWithEmail = async () => {
    const email = prompt("Enter your email");
    if (!email) return;

    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard"
      }
    });

    alert("Check your email for the login link");
  };

  const loginWithDiscord = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: window.location.origin + "/dashboard"
      }
    });
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Login</h1>

      <button onClick={loginWithEmail}>
        Login with Email
      </button>

      <div style={{ marginTop: 16 }}>
        <button onClick={loginWithDiscord}>
          Login with Discord
        </button>
      </div>
    </div>
  );
}
