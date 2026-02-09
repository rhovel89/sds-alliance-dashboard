import { useParams } from "react-router-dom";
import { supabase } from '../lib/supabaseClient';
import { useEffect, useState } from 'react';

export function useRoleAudit(allianceId?: string) {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!allianceId) return;

    supabase
      .from('alliance_role_audit')
      .select('*')
      .eq('alliance_id', allianceId)
      .order('created_at', { ascending: false })
      .then(res => setLogs(res.data || []));
  }, [allianceId]);

  return { logs };
}
