import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useSession } from "../hooks/useSession";

export function useMyAchievements() {
  const { session } = useSession();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!session) return;

    supabase
      .from("user_achievements")
      .select("*, achievements(title)")
      .eq("user_id", session.user.id)
      .then(r => setRows(r.data || []));
  }, [session]);

  return rows;
}

