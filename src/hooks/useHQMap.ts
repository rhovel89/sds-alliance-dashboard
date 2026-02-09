import { useParams } from "react-router-dom";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useHQMap(alliance_id: string) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();

    const channel = supabase
      .channel('hq-map-' + allianceId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hq_map',
          filter: 'alliance_id=eq.' + allianceId,
        },
        payload => {
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [allianceId]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('hq_map')
      .select('*')
      .eq('alliance_id', allianceId)
      .order('created_at');
    setItems(data || []);
    setLoading(false);
  }

  async function add(item: any) {
    await supabase.from('hq_map').insert(item);
  }

  async function update(id: string, updates: any) {
    await supabase.from('hq_map').update(updates).eq('id', id);
  }

  async function remove(id: string) {
    await supabase.from('hq_map').delete().eq('id', id);
  }

  return { items, loading, add, update, remove };
}
