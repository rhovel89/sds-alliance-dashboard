import { supabase } from "./supabaseClient";

export type PlayerIdentity = {
  userId: string;
  playerId: string | null;
  playerRow: any | null;
};

function msg(e: any) {
  return String(e?.message || e || "");
}

export async function resolveMyPlayerIdentity(): Promise<PlayerIdentity> {
  const u = await supabase.auth.getUser();
  const userId = String(u.data?.user?.id || "");
  if (!userId) return { userId: "", playerId: null, playerRow: null };

  // 1) Canonical link
  try {
    const link = await supabase
      .from("player_auth_links")
      .select("player_id,user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!link.error && link.data?.player_id) {
      const pid = String(link.data.player_id);
      const p = await supabase.from("players").select("*").eq("id", pid).maybeSingle();
      return { userId, playerId: pid, playerRow: p.error ? null : (p.data as any) };
    }
  } catch {}

  // 2) Fallback: oldest players row by auth_user_id
  try {
    const p = await supabase
      .from("players")
      .select("*")
      .eq("auth_user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!p.error && p.data?.id) return { userId, playerId: String(p.data.id), playerRow: p.data as any };
  } catch {}

  return { userId, playerId: null, playerRow: null };
}

export async function listMyAllianceMemberships(playerId: string) {
  try {
    const r = await supabase
      .from("player_alliances")
      .select("*")
      .eq("player_id", playerId)
      .order("alliance_code", { ascending: true });
    if (r.error) throw new Error(msg(r.error));
    return (r.data || []) as any[];
  } catch {
    return [];
  }
}
