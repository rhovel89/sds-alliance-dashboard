import { supabase } from "../lib/supabaseClient";

export async function updateMemberRole(memberId: string, role: string) {
  return supabase
    .from("alliance_members")
    .update({ role })
    .eq("id", memberId);
}
