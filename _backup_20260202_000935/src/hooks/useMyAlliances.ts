import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";

export function useMyAlliances() {
  const { session } = useAuth();
  const [alliances, setAlliances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;

    supabase
      .from("user_alliances")
      .select("alliance_id, role_label, alliances(name)")
      .eq("user_id", session.user.id)
      .then(res => {
        setAlliances(res.data || []);
        setLoading(false);
      });
  }, [session]);

  return { alliances, loading };
}
