import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export type AllianceListItem = {
  code: string;
  name: string | null;
  enabled?: boolean | null;
};

export function useAlliancesList() {
  const [alliances, setAlliances] = useState<AllianceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    // Try with enabled column first (some schemas might not have it)
    const resA = await supabase
      .from("alliances")
      .select("code,name,enabled")
      .order("code", { ascending: true });

    if (!resA.error) {
      const rows = (resA.data || []) as any[];
      const filtered = rows.filter((r) => r.enabled !== false);
      setAlliances(
        filtered.map((r) => ({
          code: String(r.code || "").toUpperCase(),
          name: r.name ?? null,
          enabled: r.enabled ?? true,
        }))
      );
      setLoading(false);
      return;
    }

    // Fallback if "enabled" doesn't exist
    const msg = (resA.error.message || "").toLowerCase();
    if (msg.includes("enabled")) {
      const resB = await supabase
        .from("alliances")
        .select("code,name")
        .order("code", { ascending: true });

      if (resB.error) {
        setError(resB.error.message);
        setLoading(false);
        return;
      }

      const rows = (resB.data || []) as any[];
      setAlliances(
        rows.map((r) => ({
          code: String(r.code || "").toUpperCase(),
          name: r.name ?? null,
          enabled: true,
        }))
      );
      setLoading(false);
      return;
    }

    setError(resA.error.message);
    setLoading(false);
  };

  useEffect(() => {
    load();

    const ch = supabase
      .channel("alliances-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alliances" },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { alliances, loading, error, refresh: load };
}
