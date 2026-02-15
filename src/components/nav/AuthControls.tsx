import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";

async function copyText(label: string, text: string) {
  try {
    await navigator.clipboard.writeText(text);
    alert(label + " copied ✅");
  } catch {
    prompt("Copy " + label + ":", text);
  }
}

function displayName(u: User) {
  const md: any = u.user_metadata || {};
  return (
    md.full_name ||
    md.name ||
    md.username ||
    u.email ||
    (u.id ? u.id.slice(0, 8) : "User")
  );
}

export default function AuthControls() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(data?.user ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (!user) return null;

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, opacity: 0.85 }}>
        Signed in: <b>{displayName(user)}</b>
      </span>

      <button onClick={() => copyText("User UUID", user.id)} title="Copy your auth user UUID">
        📋 UUID
      </button>

      <button onClick={logout} title="Logout">
        🚪 Logout
      </button>
    </div>
  );
}
