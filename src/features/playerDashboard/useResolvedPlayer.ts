import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export type PlayerAlliance = { alliance_code: string; role?: string | null };

export type ResolvedPlayer = {
  loading: boolean;
  error: string | null;

  targetPlayerId: string | null;
  targetAuthUserId: string | null;

  alliances: PlayerAlliance[];
  allianceCodes: string[];
  roleByAlliance: Record<string, string>;
};

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

export function useResolvedPlayer(targetPlayerId?: string) : ResolvedPlayer {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pid, setPid] = useState<string | null>(targetPlayerId ?? null);
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [alliances, setAlliances] = useState<PlayerAlliance[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);

      try {
        // 1) Resolve target player id
        let playerId = targetPlayerId ?? null;
        let playerAuthUid: string | null = null;

        if (playerId) {
          const { data: p, error: pErr } = await supabase
            .from("players")
            .select("id,auth_user_id")
            .eq("id", playerId)
            .maybeSingle();
          if (pErr) throw pErr;
          playerId = p?.id ? String(p.id) : null;
          playerAuthUid = p?.auth_user_id ? String(p.auth_user_id) : null;
        } else {
          const { data: uRes, error: uErr } = await supabase.auth.getUser();
          if (uErr) throw uErr;
          const uid = uRes?.user?.id ?? null;
          if (!uid) throw new Error("Not signed in.");

          const { data: p, error: pErr } = await supabase
            .from("players")
            .select("id,auth_user_id")
            .eq("auth_user_id", uid)
            .maybeSingle();
          if (pErr) throw pErr;

          playerId = p?.id ? String(p.id) : null;
          playerAuthUid = p?.auth_user_id ? String(p.auth_user_id) : uid;
        }

        if (!playerId) throw new Error("Could not resolve player id.");

        // 2) Load player alliances
        const { data: pa, error: paErr } = await supabase
          .from("player_alliances")
          .select("alliance_code,role")
          .eq("player_id", playerId);

        if (paErr) throw paErr;

        const rows = (pa ?? []).map((r: any) => ({
          alliance_code: upper(r?.alliance_code),
          role: r?.role ?? null,
        })).filter((r: any) => r.alliance_code);

        if (!cancelled) {
          setPid(playerId);
          setAuthUid(playerAuthUid);
          setAlliances(rows);
        }

      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [targetPlayerId]);

  const allianceCodes = useMemo(
    () => Array.from(new Set((alliances || []).map(a => upper(a.alliance_code)))).filter(Boolean),
    [alliances]
  );

  const roleByAlliance = useMemo(() => {
    const out: Record<string, string> = {};
    for (const a of (alliances || [])) {
      out[upper(a.alliance_code)] = String(a.role ?? "");
    }
    return out;
  }, [alliances]);

  return {
    loading,
    error,
    targetPlayerId: pid,
    targetAuthUserId: authUid,
    alliances,
    allianceCodes,
    roleByAlliance
  };
}
