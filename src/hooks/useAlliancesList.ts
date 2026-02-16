import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export type AllianceListItem = {
  code: string;
  name: string;
  enabled?: boolean | null;
};

export function useAlliancesList() {
  const [alliances, setAlliances] = useState<AllianceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("alliances")
      .select("code,name,enabled")
      .order("name", { ascending: true });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setAlliances((data ?? []) as AllianceListItem[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    const channel = supabase
      .channel("rt-alliances")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alliances" },
        () => {
          // re-fetch on any change
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return useMemo(
    () => ({ alliances, loading, error, refetch }),
    [alliances, loading, error, refetch]
  );
}
