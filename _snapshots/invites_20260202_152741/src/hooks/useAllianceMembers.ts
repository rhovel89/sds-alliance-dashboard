import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useAllianceMembers(allianceId?: string) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!allianceId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    supabase
      .from("alliance_members")
      .select("id, user_id, in_game_name, role")
      .eq("alliance_id", allianceId)
      .order("role", { ascending: false })
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
