import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export async function createInvite(alliance_id: string, userId: string) {
  const code = crypto.randomUUID();

  await supabase.from("alliance_invites").insert({
    alliance_id: alliance_id,
    invite_code: code,
    created_by: userId,
  });

  return code;
}
