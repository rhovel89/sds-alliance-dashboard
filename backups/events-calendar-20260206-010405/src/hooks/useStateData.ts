import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useStateData(stateId: string) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('events')
      .select('*')
      .eq('state_id', stateId)
      .then(({ data }) => {
        setEvents(data || []);
        setLoading(false);
      });
  }, [stateId]);

  return { events, loading };
}
