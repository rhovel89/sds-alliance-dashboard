import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function SessionGate() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      // Allow Supabase to hydrate from URL/hash
      await new Promise(r => setTimeout(r, 0));

      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      if (data.session) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }

      setReady(true);
    };

    run();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div>Initializing session…</div>
      </div>
    );
  }

  return null;
}
