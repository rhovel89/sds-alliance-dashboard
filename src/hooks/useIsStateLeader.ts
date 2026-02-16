import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useIsStateLeader() {
  const [isStateLeader, setIsStateLeader] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase.rpc("is_state_leader");
        if (!cancelled) setIsStateLeader(Boolean(data) && !error);
      } catch {
        if (!cancelled) setIsStateLeader(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { isStateLeader, loading };
}
