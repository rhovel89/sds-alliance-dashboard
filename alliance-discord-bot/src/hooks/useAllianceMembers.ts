import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useAllianceMembers(allianceId: string) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!allianceId) return;

    supabase
      .from("alliance_members")
      .select(`
        id,
        role,
        user_id,
        profiles (
          game_name
        )
      `)
      .eq("alliance_id", allianceId)
      .then(({ data, error }) => {
        if (error) {
          console.error("[useAllianceMembers]", error);
          setMembers([]);
        } else {
          setMembers(data || []);
        }
        setLoading(false);
      });
  }, [allianceId]);

  return { members, loading };
}
