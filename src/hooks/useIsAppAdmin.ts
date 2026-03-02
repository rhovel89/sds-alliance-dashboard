import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useIsAppAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        // Avoid auth/v1/user (can fail in some browsers/extensions).
        // Session is persisted locally, so this is enough to know if signed in.
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user ?? null;

        if (!user) {
          if (!cancelled) {
            setIsAdmin(false);
            setLoading(false);
          }
          return;
        }

        const r = await supabase.rpc("is_app_admin");
        const ok = r?.data === true;

        if (!cancelled) {
          setIsAdmin(ok);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? String(e));
          setIsAdmin(false);
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { isAdmin, loading, error };
}

export default useIsAppAdmin;
