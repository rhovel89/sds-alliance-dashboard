import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../hooks/useSession";

export default function LandingPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    console.log("🧪 LANDING PAGE CHECK", {
      loading,
      hasSession: !!session,
      session,
    });

    if (!loading && session) {
      navigate("/dashboard", { replace: true });
    }
  }, [session, loading, navigate]);

  if (loading) return <div>Loading…</div>;
  if (session) return null;

  return (
    <div style={{ padding: 40 }}>
      <h1>State Alliance Dashboard</h1>
      <button
        onClick={async () => {
          const { supabase } = await import("../lib/supabaseClient");
          await supabase.auth.signInWithOAuth({
            provider: "discord",
            options: { redirectTo: window.location.origin },
          });
        }}
      >
        Login with Discord
      </button>
    </div>
  );
}
