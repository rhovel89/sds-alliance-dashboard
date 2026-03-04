import { supabase } from "../lib/supabaseClient";

export async function getCanonicalPlayerIdForUser(uid: string): Promise<string | null> {
  const id = String(uid ?? "").trim();
  if (!id) return null;

  // 1) Preferred: owner-approved mapping
  try {
    const link = await supabase
      .from("player_auth_links")
      .select("player_id")
      .eq("user_id", id)
      .limit(1)
      .maybeSingle();
    const pid = link.data?.player_id ? String(link.data.player_id) : null;
    if (pid) return pid;
  } catch {}

  // 2) Fallback: players table (deterministic oldest)
  try {
    const p = await supabase
      .from("players")
      .select("id")
      .eq("auth_user_id", id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    return p.data?.id ? String(p.data.id) : null;
  } catch {
    return null;
  }
}

