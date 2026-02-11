import { useEffect, useState } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

// KEEP OLD OWNER UUID BYPASS (DO NOT REMOVE)
const OWNER_UUID = "1bf14480-765e-4704-89e6-63bfb02e1187";

// NEW: OWNER DISCORD USER ID
const OWNER_DISCORD_ID = "775966588200943616";

function isOwner(user: any) {
  if (!user) return false;

  // 1) UUID bypass (existing invariant)
  if (user.id === OWNER_UUID) return true;

  // 2) Discord identity check (owner by Discord numeric ID)
  const identities = user.identities || [];
  const discord = identities.find((i: any) => i.provider === "discord");
  const discordId =
    discord?.identity_data?.id ||
    discord?.identity_data?.sub ||
    user.user_metadata?.provider_id ||
    user.user_metadata?.sub;

  return String(discordId) === OWNER_DISCORD_ID;
}

export default function RequireAlliance() {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;

      // Not logged in
      if (!user) {
        setAllowed(false);
        return;
      }

      // ✅ Owner override — full access everywhere
      if (isOwner(user)) {
        setAllowed(true);
        return;
      }

      // Must have alliance in URL
      if (!alliance_id) {
        setAllowed(false);
        return;
      }

      // Normal alliance member check
      supabase
        .from("alliance_members")
        .select("id")
        .eq("user_id", user.id)
        .eq("alliance_id", alliance_id)
        .single()
        .then(({ data }) => {
          setAllowed(!!data);
        });
    });
  }, [alliance_id]);

  if (allowed === null) {
    return <div style={{ padding: 20 }}>Checking access…</div>;
  }

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
