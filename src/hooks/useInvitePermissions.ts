import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export function useInvitePermissions(alliance_id: string) {

  async function getPermissions() {
    const { data, error } = await supabase
      .from("alliance_invite_permissions")
      .select("*")
      .eq("alliance_id", alliance_id);

    if (error) throw error;
    return data;
  }

  async function setPermission(role: string, can_invite: boolean) {
    const { error } = await supabase
      .from("alliance_invite_permissions")
      .upsert({ alliance_id: alliance_id, role, can_invite });

    if (error) throw error;
  }

  return { getPermissions, setPermission };
}
