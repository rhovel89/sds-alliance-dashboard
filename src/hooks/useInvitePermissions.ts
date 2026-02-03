import { supabase } from "../lib/supabaseClient";

export function useInvitePermissions(allianceId: string) {

  async function getPermissions() {
    const { data, error } = await supabase
      .from("alliance_invite_permissions")
      .select("*")
      .eq("alliance_id", allianceId);

    if (error) throw error;
    return data;
  }

  async function setPermission(role: string, can_invite: boolean) {
    const { error } = await supabase
      .from("alliance_invite_permissions")
      .upsert({ alliance_id: allianceId, role, can_invite });

    if (error) throw error;
  }

  return { getPermissions, setPermission };
}
