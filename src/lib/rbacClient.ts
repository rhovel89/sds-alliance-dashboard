import { supabase } from "./supabaseClient";

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

/**
 * Owner hard-coded on server:
 *  - is_app_admin(auth.uid()) => always true
 *  - player_alliances.role == 'owner' => always true (in that alliance)
 */
export async function rbacHasPermission(allianceCode: string, permKey: string): Promise<boolean> {
  const code = upper(allianceCode);
  if (!code || !permKey) return false;

  const { data, error } = await supabase.rpc("rbac_has_permission", {
    p_alliance_code: code,
    p_perm_key: permKey,
  } as any);

  if (error) {
    // Safe fallback: don't hard fail UI if RPC isn't available yet.
    console.warn("rbac_has_permission RPC failed:", error.message);
    return false;
  }

  return Boolean(data);
}

export async function rbacMyPermissions(allianceCode: string): Promise<string[]> {
  const code = upper(allianceCode);
  if (!code) return [];

  const { data, error } = await supabase.rpc("rbac_my_permissions", {
    p_alliance_code: code,
  } as any);

  if (error) {
    console.warn("rbac_my_permissions RPC failed:", error.message);
    return [];
  }

  return Array.isArray(data) ? data.map(String) : [];
}
