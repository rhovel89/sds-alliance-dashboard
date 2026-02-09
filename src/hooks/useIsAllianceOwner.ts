import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useSession } from "../hooks/useSession";

export function useIsAllianceOwner(alliance_id: string | null) {
  const { session } = useSession();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session || !alliance_id) {
      setLoading(false);
      return;
    }

    supabase
      .from("alliance_members")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("alliance_id", alliance_id)
      .maybeSingle()
      .then(({ data }) => {
        setIsOwner(data?.role === "Owner");
        setLoading(false);
      });
  }, [session, alliance_id]);

  return { isOwner, loading };
}

