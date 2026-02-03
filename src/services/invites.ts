import { supabase } from '../lib/supabaseClient';

export async function createInvite(allianceId: string) {
  const token = crypto.randomUUID();
  await supabase.from('alliance_invites').insert({
    alliance_id: allianceId,
    token,
  });
  return token;
}

export async function revokeInvite(token: string) {
  await supabase.from('alliance_invites').delete().eq('token', token);
}
