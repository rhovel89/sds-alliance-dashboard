import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useProfiles(userIds: string[]) {
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!userIds.length) return;

    async function load() {
      const { data } = await supabase
        .from("profiles")
        .select("id, game_name")
        .in("id", userIds);

      const map: Record<string, string> = {};
      data?.forEach(p => map[p.id] = p.game_name);
      setProfiles(map);
    }

    load();
  }, [userIds.join(",")]);

  return profiles;
}
