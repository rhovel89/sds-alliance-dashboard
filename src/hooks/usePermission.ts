import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function usePermission(permissionKey: string, allianceId?: string) {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      supabase
        .from("user_permissions")
        .select("id")
        .eq("user_id", data.user.id)
        .eq("permission_id", permissionKey)
        .or(
          allianceId
            ? `alliance_id.eq.${allianceId},alliance_id.is.null`
            : "alliance_id.is.null"
        )
        .limit(1)
        .then(({ data }) => {
          setAllowed(!!data?.length);
          setLoading(false);
        });
    });
  }, [permissionKey, allianceId]);

  return { allowed, loading };
}
