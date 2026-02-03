import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        console.log("[auth] session detected → redirecting");
        navigate("/dashboard", { replace: true });
      } else {
        console.warn("[auth] no session → back to login");
        navigate("/", { replace: true });
      }
    });
  }, []);

  return (
    <div className="page">
      <h2>Finalizing login…</h2>
    </div>
  );
}

