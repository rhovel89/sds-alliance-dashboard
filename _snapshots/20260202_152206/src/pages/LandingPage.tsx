import { supabase } from "../lib/supabaseClient";

export default function LandingPage() {
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
    <div className='page' className="page" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div className='page'
        style={{
          background: "rgba(0,0,0,0.75)",
          padding: 40,
          borderRadius: 14,
          maxWidth: 420,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 0 40px rgba(0,255,0,0.15)"
        }}
      >
        {/* LOGO */}
        <div className='page'
          style={{
            marginBottom: 24,
            padding: 20,
            borderRadius: 12,
            background: "radial-gradient(circle at top, #163300, #050505)"
          }}
        >
          <img
            src="/logo.png"
            alt="Alliance Dashboard"
            style={{ width: "100%", maxWidth: 260 }}
          />
        </div>

        <h2 style={{ marginBottom: 20 }}>Alliance Dashboard</h2>

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
  );
}



