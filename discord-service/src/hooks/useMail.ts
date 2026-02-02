import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useMail(allianceId?: string) {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!allianceId) return;

    supabase
      .from('mail')
      .select('*')
      .eq('alliance_id', allianceId)
      .then(({ data }) => setMessages(data || []));
  }, [allianceId]);

  return { messages };
}
