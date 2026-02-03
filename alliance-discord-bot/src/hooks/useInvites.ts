import { supabase } from '../lib/supabaseClient';

export async function createInvite(allianceId: string, role: string) {
  const token = crypto.randomUUID();
  return supabase.from('alliance_invites').insert({
    alliance_id: allianceId,
    role,
    token
  });
}
