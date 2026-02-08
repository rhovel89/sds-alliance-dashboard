import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useUserProfile(userId?: string) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        setUser(data);
        setLoading(false);
      });
  }, [userId]);

  return { user, loading };
}
