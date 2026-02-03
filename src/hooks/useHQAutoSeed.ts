import { supabase } from '../lib/supabaseClient';

export async function ensureHQPositions(allianceId, members) {
  for (const m of members) {
    await supabase
      .from('alliance_hq_positions')
      .upsert({
        alliance_id: allianceId,
        user_id: m.user_id,
        x: Math.floor(Math.random() * 800),
        y: Math.floor(Math.random() * 800),
      }, { onConflict: 'alliance_id,user_id' });
  }
}
