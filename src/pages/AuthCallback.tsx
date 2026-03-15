import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Completing sign in...");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (code) {
          setStatus("Exchanging login code...");
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error("exchangeCodeForSession failed:", error);
            if (!cancelled) setStatus("Login failed: " + error.message);
            return;
          }

          window.history.replaceState({}, document.title, "/auth/callback");
        }

        setStatus("Loading session...");

        let user: any = null;

        for (let i = 0; i < 10; i++) {
          const u = await supabase.auth.getUser();
          user = u.data.user ?? null;
          if (user) break;
          await sleep(250);
        }

        if (!user) {
          if (!cancelled) {
            setStatus("No session found after login.");
          }
          return;
        }

        try {
          const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
            supabase.rpc("is_app_admin"),
            supabase.rpc("is_dashboard_owner"),
          ]);

          if (isAdmin === true || isOwner === true) {
            navigate("/owner/select", { replace: true });
            return;
          }
        } catch (e) {
          console.error("Owner/admin check failed:", e);
        }

        const { data: membership } = await supabase
          .from("alliance_members")
          .select("alliance_code")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (membership?.alliance_code) {
          navigate(`/dashboard/${membership.alliance_code}`, { replace: true });
          return;
        }

        navigate("/onboarding", { replace: true });
      } catch (e: any) {
        console.error("Auth callback failed:", e);
        if (!cancelled) setStatus("Login failed: " + String(e?.message || e));
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 16,
        background: "linear-gradient(180deg, #0b1117 0%, #0f1720 100%)",
      }}
    >
      <div
        className="zombie-card"
        style={{
          width: "100%",
          maxWidth: 560,
          padding: 24,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(0,0,0,0.28)",
          borderRadius: 18,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.12em", opacity: 0.72 }}>
          STATE ALLIANCE DASHBOARD
        </div>
        <h1 style={{ margin: "8px 0 0 0", fontSize: 28, fontWeight: 950 }}>
          Signing you in
        </h1>
        <div style={{ opacity: 0.8, marginTop: 10, lineHeight: 1.6 }}>
          {status}
        </div>
      </div>
    </div>
  );
}
