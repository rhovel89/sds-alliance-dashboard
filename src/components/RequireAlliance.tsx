import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const GLOBAL_OWNER_ID = '1bf14480-765e-4704-89e6-63bfb02e1187';

export default function RequireAlliance({ children }: { children: JSX.Element }) {
  const { alliance_id } = useParams<{ alliance_id: string }>();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!alliance_id) {
        setAllowed(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setAllowed(false);
        return;
      }

      // GLOBAL OWNER ALWAYS ALLOWED
      if (user.id === GLOBAL_OWNER_ID) {
        setAllowed(true);
        return;
      }

      // RLS-enforced membership check
      const { data, error } = await supabase
        .from('alliance_members')
        .select('id')
        .eq('alliance_id', alliance_id)
        .limit(1);

      if (error || !data || data.length === 0) {
        setAllowed(false);
      } else {
        setAllowed(true);
      }
    };

    run();
  }, [alliance_id]);

  if (allowed === null) {
    return <div style={{ padding: '2rem' }}>Checking alliance access…</div>;
  }

  if (!allowed) {
    return <Navigate to="/pending-approval" replace />;
  }

  return children;
}
