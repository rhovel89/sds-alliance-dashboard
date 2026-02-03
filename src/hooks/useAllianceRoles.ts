import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useAllianceRoles(allianceId: string) {
  const [roles, setRoles] = useState<any[]>([]);

  async function load() {
    const { data } = await supabase
      .from("alliance_roles")
      .select("*")
      .eq("alliance_id", allianceId)
      .order("rank");

    setRoles(data || []);
  }

  async function addRole(name: string, rank: number) {
    await supabase.from("alliance_roles").insert({
      alliance_id: allianceId,
      name,
      rank
    });
    await load();
  }

  async function updateRole(id: string, name: string, rank: number) {
    await supabase.from("alliance_roles")
      .update({ name, rank })
      .eq("id", id);
    await load();
  }

  async function deleteRole(id: string) {
    await supabase.from("alliance_roles").delete().eq("id", id);
    await load();
  }

  useEffect(() => {
    if (allianceId) load();
  }, [allianceId]);

  return { roles, addRole, updateRole, deleteRole };
}
