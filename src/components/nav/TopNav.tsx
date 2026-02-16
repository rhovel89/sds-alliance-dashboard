import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import AllianceSwitcher from "./AllianceSwitcher";
import AuthControls from "./AuthControls";
import { useIsAppAdmin } from "../../hooks/useIsAppAdmin";

export default function TopNav() {
  
  const { isAdmin: isAppAdmin } = useIsAppAdmin();const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let alive = true;

    async function refresh() {
      const u = await supabase.auth.getUser();
      const uid = u.data.user?.id ?? null;
      if (!alive) return;

      setUserId(uid);

      if (!uid) {
        setIsAdmin(false);
        return;
      }

      const adminRes = await supabase
        .from("app_admins")
        .select("user_id")
        .eq("user_id", uid)
        .maybeSingle();

      if (!alive) return;
      setIsAdmin(!!adminRes.data);
    }

    refresh();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderBottom: "1px solid #222",
        background: "#0b0b0b",
        padding: "10px 14px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <a href="/dashboard" style={{ fontWeight: 900 }}>🧟 State Alliance</a>
        <a href="/onboarding" style={{ fontSize: 12 }}>Onboarding</a>
        {isAppAdmin ? <a href="/owner" style={{ fontSize: 12 }}>Owner</a> : null}
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <AllianceSwitcher />

        {userId ? (
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
          >
            Log Out
          </button>
        ) : (
          <a href="/dashboard" style={{ fontSize: 12 }}>Sign In</a>
        )}
      </div>
    </div>
  );
}




