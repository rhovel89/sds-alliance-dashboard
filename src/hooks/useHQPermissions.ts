import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useHQPermissions(allianceId?: string) {
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    if (!allianceId) return;

    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;

      const { data } = await supabase
        .from("alliance_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("alliance_id", allianceId.toUpperCase())
        .single();

      if (!data) return;

      const allowed = ["Owner", "R5", "R4"];
      setCanEdit(allowed.includes(data.role));
    };

    load();
  }, [allianceId]);

  return { canEdit };
}
