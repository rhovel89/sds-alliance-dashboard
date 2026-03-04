import { supabase } from "../lib/supabaseClient";

export async function getCanonicalPlayerIdForUser(uid: string): Promise<string | null> {
  if (!uid) return null;

  // 1) Preferred: player_auth_links (owner-approved canonical mapping)
  try {
    const link = await supabase
      .from("player_auth_links")
      .select("player_id")
      .eq("user_id", uid)
      .limit(1)
      .maybeSingle();

    const pid = link.data?.player_id ? String(link.data.player_id) : null;
    if (pid) return pid;
  } catch {}

  // 2) Fallback: players by auth_user_id (deterministic oldest row)
  try {
    const p = await supabase
      .from("players")
      .select("id")
      .eq("auth_user_id", uid)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const pid = p.data?.id ? String(p.data.id) : null;
    return pid || null;
  } catch {
    return null;
  }
}
