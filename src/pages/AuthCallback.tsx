import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const finishAuth = async () => {
      const { error } = await supabase.auth.getSession();

      if (error) {
        console.error("Auth callback error:", error);
        navigate("/");
        return;
      }

      navigate("/dashboard", { replace: true });
    };

    finishAuth();
  }, [navigate]);

  return <div>Finishing sign in…</div>;
}
