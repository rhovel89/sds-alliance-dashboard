import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useUserAlliances(userId?: string) {
  const [alliances, setAlliances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    supabase
      .from('user_alliances')
      .select('alliance_id, alliances(name)')
      .eq('user_id', userId)
      .then(({ data }) => {
        setAlliances(data || []);
        setLoading(false);
      });
  }, [userId]);

  return { alliances, loading };
}
