import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session || !session.user) {
        navigate("/", { replace: true });
        return;
      }

      // ✅ OWNER ALWAYS SEES PICKER
      if (isOwner(session.user)) {
        navigate("/owner/select", { replace: true });
        return;
      }

      // Normal alliance membership check
      const { data: memberships, error } = await supabase
        .from("alliance_members")
        .select("alliance_id")
        .limit(1);

      if (error || !memberships || memberships.length === 0) {
        navigate("/onboarding", { replace: true });
        return;
      }

      navigate(`/dashboard/${memberships[0].alliance_id}`, { replace: true });
    };

    run();
  }, [navigate]);

  return null;
}
