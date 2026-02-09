import { useParams } from "react-router-dom";
import { supabase } from './supabaseClient';

export async function changeMemberRole(userId: string, alliance_id: string, role: string) {
  return supabase
    .from('alliance_members')
    .update({ role })
    .eq('user_id', userId)
    .eq('alliance_id', alliance_id);
}
