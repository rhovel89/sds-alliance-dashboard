import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useIsAppAdmin } from "../../hooks/useIsAppAdmin";

type Row = { user_id: string; created_at: string };

export default function StateLeadersPage() {
  
  const [nameByUserId, setNameByUserId] = useState<Record<string, string>>({});

  const leaderLabel = (userId?: string | null) => {
    const id = (userId || "").trim();
    if (!id) return "";
    return nameByUserId[id] ?? id;
  };

  const loadLeaderNames = async (userIds: string[]) => {
    const ids = Array.from(new Set((userIds || []).map((x) => (x || "").trim()).filter(Boolean)));
    if (ids.length === 0) { setNameByUserId({}); return; }

    // 1) Best: link table -> players (if relationships exist)
    {
      const { data, error } = await supabase
        .from("player_auth_links")
        .select("user_id, players(game_name)")
        .in("user_id", ids);

      if (!error && data) {
        const map: Record<string, string> = {};
        for (const row of data as any[]) {
          const uid = row.user_id;
          const gn = row.players?.game_name || row.players?.name;
          if (uid && gn) map[uid] = gn;
        }
        if (Object.keys(map).length > 0) { setNameByUserId(map); return; }
      }
    }

    // 2) Fallback: players has auth_user_id
    {
      const { data, error } = await supabase
        .from("players")
        .select("auth_user_id, game_name")
        .in("auth_user_id" as any, ids);

      if (!error && data) {
        const map: Record<string, string> = {};
        for (const row of data as any[]) {
          const uid = row.auth_user_id;
          const gn = row.game_name;
          if (uid && gn) map[uid] = gn;
        }
        if (Object.keys(map).length > 0) { setNameByUserId(map); return; }
      }
    }

    // 3) Last fallback: players has user_id
    {
      const { data, error } = await supabase
        .from("players")
        .select("user_id, game_name")
        .in("user_id" as any, ids);

      if (!error && data) {
        const map: Record<string, string> = {};
        for (const row of data as any[]) {
          const uid = row.user_id;
          const gn = row.game_name;
          if (uid && gn) map[uid] = gn;
        }
        if (Object.keys(map).length > 0) { setNameByUserId(map); return; }
      }
    }

    setNameByUserId({});
  };

  useEffect(() => {
    const ids = ((rows ?? []) as any[]).map((r) => (r as any)?.user_id).filter(Boolean);
    loadLeaderNames(ids as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);
const { isAdmin, loading } = useIsAppAdmin();
  const [rows, setRows] = useState<Row[]>([]);
  const [userId, setUserId] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await supabase
      .from("state_leaders")
      .select("user_id,created_at")
      .order("created_at", { ascending: false });

    if (res.error) {
      console.error(res.error);
      return;
    }
    setRows((res.data ?? []) as Row[]);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    const v = userId.trim();
    if (!v) return;
    setBusy(true);
    const res = await supabase.from("state_leaders").insert({ user_id: v });
    setBusy(false);

    if (res.error) {
      console.error(res.error);
      alert(res.error.message);
      return;
    }
    setUserId("");
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove State Leader?")) return;
    setBusy(true);
    const res = await supabase.from("state_leaders").delete().eq("user_id", id);
    setBusy(false);

    if (res.error) {
      console.error(res.error);
      alert(res.error.message);
      return;
    }
    await load();
  };

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  if (!isAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <h2>State Leaders</h2>
        <div style={{ opacity: 0.8 }}>Owner/Admin only.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>👑 State Leaders (Owner/Admin)</h2>

      <div style={{ border: "1px solid #333", borderRadius: 10, padding: 14, maxWidth: 700 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Add State Leader by User UUID</div>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            placeholder="User UUID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={{ flex: 1 }}
          />
          <button onClick={add} disabled={busy}>Add</button>
          <button onClick={load} disabled={busy}>Refresh</button>
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
          {rows.length === 0 ? (
            <div style={{ opacity: 0.75 }}>No state leaders yet.</div>
          ) : (
            rows.map((r) => (
              <div key={leaderLabel(r.user_id)} style={{ border: "1px solid #222", borderRadius: 10, padding: 10, display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{leaderLabel(r.user_id)}</div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>{new Date(r.created_at).toLocaleString()}</div>
                </div>
                <button onClick={() => remove(r.user_id)} disabled={busy}>Remove</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


