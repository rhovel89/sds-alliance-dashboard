import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";

export function useMyAchievements() {
  const { session } = useAuth();
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
