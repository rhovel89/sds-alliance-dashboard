import { useParams } from "react-router-dom";
import { supabase } from '../lib/supabaseClient';

export async function changeMemberRole(alliance_id: string, userId: string, role: string) {
  await supabase.from('alliance_members')
    .update({ role })
    .eq('alliance_id', alliance_id)
    .eq('user_id', userId);

  await supabase.from('alliance_role_audit').insert({
    alliance_id: alliance_id,
    target_user: userId,
    new_role: role,
  });
}
