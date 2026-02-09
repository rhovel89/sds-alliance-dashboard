import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useRosterPermissions(alliance_id: string, role: string) {
  const [permissions, setPermissions] = useState<any>(null);

  useEffect(() => {
    if (!alliance_id || !role) return;

    supabase
      .from("alliance_permissions")
      .select("*")
      .eq("alliance_id", alliance_id)
      .eq("role", role)
      .maybeSingle()
      .then(({ data }) => {
        setPermissions(data);
      });
  }, [alliance_id, role]);

  return permissions;
}
