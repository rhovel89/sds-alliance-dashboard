import { supabase } from '../lib/supabaseClient';

export function useCreateInvite() {
  async function createInvite(allianceId: string, role = 'Member') {
    const token = crypto.randomUUID();

    await supabase.from('alliance_invites').insert({
      alliance_id: allianceId,
      token,
      role
    });

    return "/invite/";
  }

  return { createInvite };
}
