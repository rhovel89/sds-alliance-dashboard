import { supabase } from "../supabaseClient";

export async function getHQMap(allianceId: string) {
  const { data, error } = await supabase
    .from("hq_slots")
    .select("slot_index, player_name, coords")
    .eq("alliance_id", allianceId)
    .order("slot_index");

  if (error) throw error;
  return data;
}
