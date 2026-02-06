import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useAllianceData(allianceId?: string) {
  const [members, setMembers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!allianceId) { setLoading(false); return; }

    Promise.all([
      supabase.from('user_alliances').select('*').eq('alliance_id', allianceId),
      supabase.from('events').select('*').eq('alliance_id', allianceId),
    ]).then(([m, e]) => {
      setMembers(m.data || []);
      setEvents(e.data || []);
      setLoading(false);
    });
  }, [allianceId]);

  return { members, events, loading };
}
