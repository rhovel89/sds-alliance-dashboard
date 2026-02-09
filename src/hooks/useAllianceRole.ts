import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useAllianceRole(allianceId?: string) {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!allianceId) return;

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;

      supabase
        .from('alliance_members')
        .select('role')
        .eq('alliance_id', allianceId)
        .eq('user_id', data.user.id)
        .maybeSingle()
        .then(({ data }) => {
          setRole(data?.role ?? null);
          setLoading(false);
        });
    });
  }, [allianceId]);

  return { role, loading };
}