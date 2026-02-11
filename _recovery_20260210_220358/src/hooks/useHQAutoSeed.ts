import { useParams } from "react-router-dom";
import { supabase } from '../lib/supabaseClient';

export async function ensureHQPositions(alliance_id, members) {
  for (const m of members) {
    await supabase
      .from('alliance_hq_positions')
      .upsert({
        alliance_id: alliance_id,
        user_id: m.user_id,
        x: Math.floor(Math.random() * 800),
        y: Math.floor(Math.random() * 800),
      }, { onConflict: 'alliance_id,user_id' });
  }
}
