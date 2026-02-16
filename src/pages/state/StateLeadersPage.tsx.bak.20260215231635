import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useIsAppAdmin } from "../../hooks/useIsAppAdmin";

type LeaderRow = Record<string, any>;

export default function StateLeadersPage() {
  const { isAdmin, loading } = useIsAppAdmin();

  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [nameByUserId, setNameByUserId] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  const refetch = async () => {
    setErr(null);

    const { data, error } = await supabase
      .from("state_leaders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setErr(error.message || "Failed to load state leaders.");
      setRows([]);
      return;
    }

    setRows((data || []) as LeaderRow[]);
  };

  const userIds = useMemo(() => {
    const ids = (rows || [])
      .map((r) => String(r?.user_id || "").trim())
      .filter(Boolean);
    return Array.from(new Set(ids));
  }, [rows]);

  const loadLeaderNames = async (ids: string[]) => {
    const uniq = Array.from(new Set((ids || []).map((x) => String(x || "").trim()).filter(Boolean)));
    if (uniq.length === 0) { setNameByUserId({}); return; }

    // 1) Best: players.auth_user_id -> game_name
    {
      const { data, error } = await supabase
        .from("players")
        .select("auth_user_id, game_name")
        .in("auth_user_id", uniq);

      if (!error && data) {
        const map: Record<string, string> = {};
        for (const row of data as any[]) {
          const uid = String(row?.auth_user_id || "").trim();
          const gn = String(row?.game_name || "").trim();
          if (uid && gn) map[uid] = gn;
        }
        if (Object.keys(map).length > 0) { setNameByUserId(map); return; }
      }
    }

    // 2) Fallback: player_auth_links(user_id -> player_id) then players(id -> game_name)
    {
      const { data: links, error: linkErr } = await supabase
        .from("player_auth_links")
        .select("user_id, player_id")
        .in("user_id", uniq);

      if (!linkErr && links && (links as any[]).length > 0) {
        const userToPlayer: Record<string, string> = {};
        const playerIds: string[] = [];

        for (const l of links as any[]) {
          const uid = String(l?.user_id || "").trim();
          const pid = String(l?.player_id || "").trim();
          if (uid && pid) {
            userToPlayer[uid] = pid;
            playerIds.push(pid);
          }
        }

        const uniqPlayers = Array.from(new Set(playerIds)).filter(Boolean);
        if (uniqPlayers.length > 0) {
          const { data: players, error: pErr } = await supabase
            .from("players")
            .select("id, game_name")
            .in("id", uniqPlayers);

          if (!pErr && players) {
            const pidToName: Record<string, string> = {};
            for (const p of players as any[]) {
              const pid = String(p?.id || "").trim();
              const gn = String(p?.game_name || "").trim();
              if (pid && gn) pidToName[pid] = gn;
            }

            const map: Record<string, string> = {};
            for (const uid of Object.keys(userToPlayer)) {
              const pid = userToPlayer[uid];
              const gn = pidToName[pid];
              if (gn) map[uid] = gn;
            }

            if (Object.keys(map).length > 0) { setNameByUserId(map); return; }
          }
        }
      }
    }

    // No mapping found; keep UUIDs
    setNameByUserId({});
  };

  const leaderLabel = (userId?: string | null) => {
    const id = String(userId || "").trim();
    if (!id) return "";
    return nameByUserId[id] ?? id;
  };

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) return;
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAdmin]);

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) return;
    loadLeaderNames(userIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAdmin, userIds.join("|")]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  if (!isAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <h2>State Leaders</h2>
        <div style={{ opacity: 0.8 }}>You do not have access to this page.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>👑 State Leaders</h2>

      {err ? (
        <div style={{ marginTop: 10, padding: 10, border: "1px solid #700", borderRadius: 8 }}>
          <strong>Error:</strong> {err}
        </div>
      ) : null}

      <div style={{ marginTop: 12 }}>
        <button onClick={refetch}>Refresh</button>
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
        {rows.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No state leaders found.</div>
        ) : (
          rows.map((r, idx) => {
            const uid = String(r?.user_id || "").trim();
            const name = leaderLabel(uid);

            const position =
              r?.position ??
              r?.title ??
              r?.role ??
              r?.rank ??
              r?.leader_role ??
              "";

            const alliance =
              r?.alliance_code ??
              r?.alliance_id ??
              r?.alliance_tag ??
              r?.tag ??
              "";

            return (
              <div
                key={String(r?.id || idx)}
                style={{
                  border: "1px solid #333",
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 16 }}>
                  {name}
                </div>

                <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
                  UUID: {uid || "(missing)"}
                  {uid ? (
                    <button style={{ marginLeft: 10 }} onClick={() => copy(uid)}>
                      Copy
                    </button>
                  ) : null}
                </div>

                {(position || alliance) ? (
                  <div style={{ marginTop: 8, display: "grid", gap: 4, fontSize: 13 }}>
                    {position ? <div><strong>Role:</strong> {String(position)}</div> : null}
                    {alliance ? <div><strong>Alliance:</strong> {String(alliance)}</div> : null}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
