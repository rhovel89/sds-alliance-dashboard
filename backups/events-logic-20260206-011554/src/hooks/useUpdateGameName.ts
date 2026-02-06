import { supabase } from "../lib/supabaseClient";

export async function updateGameName(userId: string, gameName: string) {
  return supabase
    .from("profiles")
    .update({ game_name: gameName })
    .eq("user_id", userId);
}
