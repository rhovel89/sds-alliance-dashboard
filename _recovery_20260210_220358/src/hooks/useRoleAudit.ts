import { useParams } from "react-router-dom";
import { supabase } from '../lib/supabaseClient';
import { useEffect, useState } from 'react';

export function useRoleAudit(alliance_id?: string) {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!alliance_id) return;

    supabase
      .from('alliance_role_audit')
      .select('*')
      .eq('alliance_id', alliance_id)
      .order('created_at', { ascending: false })
      .then(res => setLogs(res.data || []));
  }, [alliance_id]);

  return { logs };
}
