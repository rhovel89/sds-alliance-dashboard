import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useAllianceMembers(allianceId: string) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!allianceId) return;

    async function load() {
      const { data: memberRows, error } = await supabase
        .from("alliance_members")
        .select("user_id, role")
        .eq("alliance_id", allianceId);

      if (error) {
        console.error("[useAllianceMembers]", error);
        setLoading(false);
        return;
      }

      const userIds = memberRows.map(m => m.user_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, game_name")
        .in("user_id", userIds);

      const profileMap = Object.fromEntries(
        (profiles || []).map(p => [p.user_id, p.game_name])
      );

      setMembers(
        memberRows.map(m => ({
          ...m,
          game_name: profileMap[m.user_id] || "—"
        }))
      );

      setLoading(false);
    }

    load();
  }, [allianceId]);

  return { members, loading };
}
