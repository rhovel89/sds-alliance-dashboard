import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useIsAppAdmin() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const check = async () => {
    setLoading(true);

    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    // Prefer RPC
    const rpc = await supabase.rpc("is_app_admin");
    if (!rpc.error) {
      setIsAdmin(!!rpc.data);
      setLoading(false);
      return;
    }

    // Fallback: app_admins (policy allows selecting your own row)
    const sel = await supabase.from("app_admins").select("user_id").limit(1);
    setIsAdmin(!sel.error && (sel.data?.length ?? 0) > 0);
    setLoading(false);
  };

  useEffect(() => {
    check();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      sub?.subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isAdmin, loading, refresh: check };
}
