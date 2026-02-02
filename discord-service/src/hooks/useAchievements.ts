import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useAchievements(userId?: string) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .then(({ data }) => {
        setItems(data || []);
        setLoading(false);
      });
  }, [userId]);

  return { items, loading };
}
