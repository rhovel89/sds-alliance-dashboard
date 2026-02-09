import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useAllianceMembers(allianceId: string) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!allianceId) return;

    async function load() {
      const { data, error } = await supabase
        .from("alliance_members")
        .select("id, user_id, role")
        .eq("alliance_id", allianceId);

      if (!error) setMembers(data || []);
      setLoading(false);
    }

    load();
  }, [allianceId]);

  return { members, loading };
}
