import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useHQs(allianceId?: string) {
  const [hqs, setHqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!allianceId) return;

    supabase
      .from('hq_locations')
      .select('*')
      .eq('alliance_id', allianceId)
      .then(({ data }) => {
        setHqs(data || []);
        setLoading(false);
      });
  }, [allianceId]);

  return { hqs, loading };
}
