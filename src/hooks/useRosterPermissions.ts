import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useRosterPermissions(allianceId: string, role: string) {
  const [permissions, setPermissions] = useState<any>(null);

  useEffect(() => {
    if (!allianceId || !role) return;

    supabase
      .from("alliance_permissions")
      .select("*")
      .eq("alliance_id", allianceId)
      .eq("role", role)
      .maybeSingle()
      .then(({ data }) => {
        setPermissions(data);
      });
  }, [allianceId, role]);

  return permissions;
}
