import { useParams } from "react-router-dom";
import { supabase } from '../lib/supabaseClient';

export async function createInvite(alliance_id: string) {
  const token = crypto.randomUUID();
  await supabase.from('alliance_invites').insert({
    alliance_id: alliance_id,
    token,
  });
  return token;
}

export async function revokeInvite(token: string) {
  await supabase.from('alliance_invites').delete().eq('token', token);
}
