import { supabase } from "../lib/supabaseClient";
import { nanoid } from "nanoid";

export async function createInvite(allianceId: string, role = "Member", email?: string) {
  const token = nanoid(24);

  return supabase.from("alliance_invites").insert({
    alliance_id: allianceId,
    role,
    email,
    token,
    invited_by: (await supabase.auth.getUser()).data.user?.id
  });
}
