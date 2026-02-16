import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useIsAppAdmin } from "../../hooks/useIsAppAdmin";

type LeaderRow = {
  id: string;
  user_id: string | null;
  title?: string | null;
  created_at?: string | null;
};

export default function StateLeadersPage() {
  const { isAdmin, loading } = useIsAppAdmin();

  const [rows, setRows] = useState<LeaderRow[]>([]);
  const leaders = rows; // alias to prevent ReferenceError
  const [nameByUserId, setNameByUserId] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const userIds = useMemo(() => {
    return Array.from(
      new Set((rows || []).map((r) => (r.user_id || "").trim()).filter(Boolean))
    );
  }, [rows]);

  useEffect(() => {
    const load = async () => {
      setErrorMsg(null);
      const { data, error } = await supabase
        .from("state_leaders")
        .select("id,user_id,title,created_at")
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMsg(error.message);
        setRows([]);
        return;
      }

      setRows((data as any[]) || []);
    };

    load();
  }, []);

  useEffect(() => {
    const loadNames = async () => {
      if (!userIds || userIds.length === 0) {
        setNameByUserId({});
        return;
      }

      // Primary: players.auth_user_id -> game_name (your schema uses auth_user_id, NOT user_id)
      {
        const { data, error } = await supabase
          .from("players")
          .select("auth_user_id, game_name")
          .in("auth_user_id", userIds);

        if (!error && data) {
          const map: Record<string, string> = {};
          for (const r of data as any[]) {
            if (r.auth_user_id && r.game_name) map[r.auth_user_id] = r.game_name;
          }
          if (Object.keys(map).length > 0) {
            setNameByUserId(map);
            return;
          }
        }
      }

      // Fallback: player_auth_links(user_id -> player_id) + players(id -> game_name)
      {
        const { data: links, error: linkErr } = await supabase
          .from("player_auth_links")
          .select("user_id, player_id")
          .in("user_id", userIds);

        if (!linkErr && links && (links as any[]).length > 0) {
          const userToPlayer: Record<string, string> = {};
          const playerIds: string[] = [];

          for (const l of links as any[]) {
            if (l.user_id && l.player_id) {
              userToPlayer[l.user_id] = l.player_id;
              playerIds.push(l.player_id);
            }
          }

          const uniq = Array.from(new Set(playerIds));
          if (uniq.length > 0) {
            const { data: players, error: pErr } = await supabase
              .from("players")
              .select("id, game_name")
              .in("id", uniq);

            if (!pErr && players) {
              const pidToName: Record<string, string> = {};
              for (const p of players as any[]) {
                if (p.id && p.game_name) pidToName[p.id] = p.game_name;
              }

              const map: Record<string, string> = {};
              for (const uid of Object.keys(userToPlayer)) {
                const pid = userToPlayer[uid];
                const nm = pidToName[pid];
                if (nm) map[uid] = nm;
              }

              if (Object.keys(map).length > 0) {
                setNameByUserId(map);
                return;
              }
            }
          }
        }
      }

      setNameByUserId({});
    };

    loadNames();
  }, [userIds]);

  const leaderLabel = (uid?: string | null) => {
    const id = (uid || "").trim();
    if (!id) return "";
    return nameByUserId[id] ?? id;
  };

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  // If you want everyone to see this page later, remove this block.
  if (!isAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <h2>State Leaders</h2>
        <p>Admins only.</p>
        <p><Link to="/dashboard">Back to Dashboard</Link></p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>👑 State Leaders</h2>
        <div>
          <Link to="/owner/state" style={{ marginRight: 12 }}>Owner State</Link>
          <Link to="/state">State</Link>
        </div>
      </div>

      {errorMsg ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255,255,255,0.15)" }}>
          <b>Error:</b> {errorMsg}
        </div>
      ) : null}

      <div style={{ marginTop: 16 }}>
        {(rows || []).length === 0 ? (
          <p>No state leaders yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid rgba(255,255,255,0.15)" }}>Player</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid rgba(255,255,255,0.15)" }}>Title</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid rgba(255,255,255,0.15)" }}>User UUID</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    {leaderLabel(r.user_id)}
                  </td>
                  <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    {r.title || ""}
                  </td>
                  <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)", fontFamily: "monospace", fontSize: 12 }}>
                    {r.user_id || ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

