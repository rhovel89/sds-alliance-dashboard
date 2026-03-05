import type { SupabaseClient } from "@supabase/supabase-js";

export async function resolveCurrentPlayerId(supabase: SupabaseClient): Promise<string | null> {
  // Prefer RPC (fast + canonical)
  try {
    const r = await supabase.rpc("current_player_id");
    const v = (r as any)?.data;
    if (!r.error && v) return String(v);
  } catch {}

  // Fallback to direct tables
  try {
    const u = await supabase.auth.getUser();
    const uid = u.data?.user?.id;
    if (!uid) return null;

    const pal = await supabase
      .from("player_auth_links")
      .select("player_id")
      .eq("user_id", uid)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!pal.error && pal.data?.player_id) return String((pal.data as any).player_id);

    const p = await supabase
      .from("players")
      .select("id")
      .eq("auth_user_id", uid)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!p.error && p.data?.id) return String((p.data as any).id);
  } catch {}

  return null;
}
