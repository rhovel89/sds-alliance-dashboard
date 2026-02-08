import { supabase } from '../lib/supabaseClient';

export function useProfiles() {

  async function ensureProfile(userId: string, gameName: string) {
    await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        game_name: gameName
      }, { onConflict: 'user_id' });
  }

  async function updateGameName(userId: string, gameName: string) {
    const { error } = await supabase
      .from('profiles')
      .update({ game_name: gameName })
      .eq('user_id', userId);

    if (error) throw error;
  }

  return { ensureProfile, updateGameName };
}
