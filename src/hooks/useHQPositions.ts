import { useParams } from "react-router-dom";
import { supabase } from '../lib/supabaseClient';

export async function saveHQPosition(allianceId, userId, x, y) {
  await supabase
    .from('alliance_hq_positions')
    .upsert({
      alliance_id: allianceId,
      user_id: userId,
      x,
      y,
      updated_at: new Date()
    }, { onConflict: 'alliance_id,user_id' });
}
