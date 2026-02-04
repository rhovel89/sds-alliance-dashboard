import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let handled = false;

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (handled) return;
        handled = true;

        if (session) {
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      Finishing sign-in…
    </div>
  );
}
