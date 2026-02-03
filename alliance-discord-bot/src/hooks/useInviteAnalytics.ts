import { supabase } from "../lib/supabaseClient";

export async function getInviteAnalytics(allianceId: string) {
  const { data, error } = await supabase
    .from("invite_analytics")
    .select("*")
    .eq("alliance_id", allianceId)
    .single();

  if (error) throw error;
  return data;
}
