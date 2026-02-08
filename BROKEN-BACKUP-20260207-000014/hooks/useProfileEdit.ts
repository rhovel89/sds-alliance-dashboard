import { supabase } from '../lib/supabaseClient';

export async function updateGameName(userId: string, gameName: string) {
  await supabase.from('profiles')
    .upsert({ user_id: userId, game_name: gameName });
}
