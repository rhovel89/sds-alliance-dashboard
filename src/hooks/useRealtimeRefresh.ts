import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

type Change = { table: string; filter?: string };

export function useRealtimeRefresh(opts: {
  channel: string;
  enabled: boolean;
  changes: Change[];
  onChange: () => void;
  debounceMs?: number;
}) {
  const { channel, enabled, changes, onChange, debounceMs = 250 } = opts;

  useEffect(() => {
    if (!enabled) return;
    if (!changes || !changes.length) return;

    let alive = true;
    const ch = supabase.channel(channel);

    for (const c of changes) {
      ch.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: c.table,
          filter: c.filter,
        },
        () => {
          if (!alive) return;
          window.clearTimeout((window as any).__rt_refresh_t);
          (window as any).__rt_refresh_t = window.setTimeout(() => {
            try { onChange(); } catch {}
          }, debounceMs);
        }
      );
    }

    ch.subscribe();

    return () => {
      alive = false;
      try { supabase.removeChannel(ch); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, enabled]);
}
