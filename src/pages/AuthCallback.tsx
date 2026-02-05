import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const finalize = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        console.error("SESSION FAILED", error);
        navigate("/login", { replace: true });
        return;
      }

      console.log("SESSION OK");
      navigate("/dashboard", { replace: true });
    };

    finalize();
  }, [navigate]);

  return <p>Signing you in…</p>;
}
