import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";

export function useIsAllianceOwner(allianceId: string | null) {
  const { session } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session || !allianceId) {
      setLoading(false);
      return;
    }

    supabase
      .from("alliance_members")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("alliance_id", allianceId)
      .single()
      .then(({ data }) => {
        setIsOwner(data?.role === "Owner");
        setLoading(false);
      });
  }, [session, allianceId]);

  return { isOwner, loading };
}
