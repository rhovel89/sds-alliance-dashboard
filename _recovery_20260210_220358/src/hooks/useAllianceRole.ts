import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useAllianceRole(alliance_id?: string) {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!alliance_id) return;

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;

      supabase
        .from('alliance_members')
        .select('role')
        .eq('alliance_id', alliance_id)
        .eq('user_id', data.user.id)
        .maybeSingle()
        .then(({ data }) => {
          setRole(data?.role ?? null);
          setLoading(false);
        });
    });
  }, [alliance_id]);

  return { role, loading };
}