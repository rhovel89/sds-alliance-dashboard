import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useAchievements(stateId?: number) {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = supabase.from("achievements").select("*");
    if (stateId) q = q.eq("state_id", stateId);

    q.then(r => {
      setList(r.data || []);
      setLoading(false);
    });
  }, [stateId]);

  return { list, loading };
}
