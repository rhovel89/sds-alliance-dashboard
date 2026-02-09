import { useParams } from "react-router-dom";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useAllianceData(alliance_id?: string) {
  const [members, setMembers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!alliance_id) { setLoading(false); return; }

    Promise.all([
      supabase.from('user_alliances').select('*').eq('alliance_id', alliance_id),
      supabase.from('events').select('*').eq('alliance_id', alliance_id),
    ]).then(([m, e]) => {
      setMembers(m.data || []);
      setEvents(e.data || []);
      setLoading(false);
    });
  }, [alliance_id]);

  return { members, events, loading };
}
