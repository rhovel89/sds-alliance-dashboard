import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type OwnerState = {
  loading: boolean;
  isOwner: boolean;
  error: string | null;
};

export function useIsDashboardOwner(): OwnerState {
  const [state, setState] = useState<OwnerState>({
    loading: true,
    isOwner: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const { data, error } = await supabase.rpc("is_dashboard_owner");
      if (cancelled) return;

      if (error) {
        setState({ loading: false, isOwner: false, error: (error as any).message || "RPC error" });
        return;
      }

      setState({ loading: false, isOwner: data === true, error: null });
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}