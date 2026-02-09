import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useAllianceMembers(alliance_id: string) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!alliance_id) return;

    async function load() {
      const { data, error } = await supabase
        .from("alliance_members")
        .select("id, user_id, role")
        .eq("alliance_id", alliance_id);

      if (!error) setMembers(data || []);
      setLoading(false);
    }

    load();
  }, [alliance_id]);

  return { members, loading };
}
