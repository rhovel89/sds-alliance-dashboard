import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Alliance = { code: string; name: string; enabled: boolean };
type Player = { id: string; game_name: string; note: string | null; created_at: string };
type PlayerAlliance = { id: string; player_id: string; alliance_code: string; role: "owner" | "r5" | "r4" | "member" | "viewer" };

const ROLES: PlayerAlliance["role"][] = ["member", "viewer", "r5", "r4", "owner"];

function normCode(v: string) {
  return v.trim().toUpperCase();
}

export default function OwnerPlayersPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [alliances, setAlliances] = useState<Alliance[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [assignments, setAssignments] = useState<Record<string, PlayerAlliance[]>>({});

  const [search, setSearch] = useState("");

  // Add player form
  const [gameName, setGameName] = useState("");
  const [note, setNote] = useState("");
  const [addAlliance, setAddAlliance] = useState("");
  const [addRole, setAddRole] = useState<PlayerAlliance["role"]>("member");

  // Link + sync memberships
  const [linkPlayerId, setLinkPlayerId] = useState("");
  const [linkUserId, setLinkUserId] = useState("");

  async function boot() {
    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id ?? null;
    setUserId(uid);
    if (!uid) return;

    const adminRes = await supabase
      .from("app_admins")
      .select("user_id")
      .eq("user_id", uid)
      .maybeSingle();

    const ok = !!adminRes.data;
    setIsAdmin(ok);

    if (ok) await fetchAll();
  }

  async function fetchAll() {
    setError(null);

    const a = await supabase.from("alliances").select("code, name, enabled").order("code");
    if (a.error) return setError(a.error.message);
    setAlliances((a.data ?? []) as any);

    const p = await supabase
      .from("players")
      .select("id, game_name, note, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (p.error) return setError(p.error.message);
    setPlayers((p.data ?? []) as any);

    const ids = (p.data ?? []).map((x: any) => x.id);
    if (ids.length) {
      const pa = await supabase
        .from("player_alliances")
        .select("id, player_id, alliance_code, role")
        .in("player_id", ids);

      if (pa.error) return setError(pa.error.message);

      const grouped: Record<string, PlayerAlliance[]> = {};
      (pa.data ?? []).forEach((row: any) => {
        grouped[row.player_id] = grouped[row.player_id] ?? [];
        grouped[row.player_id].push(row);
      });

      Object.keys(grouped).forEach((k) => {
        grouped[k].sort((x, y) => x.alliance_code.localeCompare(y.alliance_code));
      });

      setAssignments(grouped);
    } else {
      setAssignments({});
    }
  }

  useEffect(() => {
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) => p.game_name.toLowerCase().includes(q));
  }, [players, search]);

  async function addPlayer() {
    setError(null);

    const gn = gameName.trim();
    if (!gn) return alert("Game Name required.");

    const allianceCode = normCode(addAlliance);
    if (!allianceCode) return alert("Alliance code required (ex: SDS).");

    const p = await supabase
      .from("players")
      .insert({ game_name: gn, note: note.trim() || null })
      .select("id")
      .maybeSingle();

    if (p.error || !p.data) {
      setError(p.error?.message ?? "Failed to create player.");
      return;
    }

    const pa = await supabase.from("player_alliances").insert({
      player_id: p.data.id,
      alliance_code: allianceCode,
      role: addRole
    });

    if (pa.error) {
      setError(pa.error.message);
      return;
    }

    setGameName("");
    setNote("");
    setAddAlliance("");
    setAddRole("member");

    await fetchAll();
  }

  async function addAssignment(player_id: string, alliance_code: string, role: PlayerAlliance["role"]) {
    setError(null);

    const res = await supabase.from("player_alliances").insert({
      player_id,
      alliance_code: normCode(alliance_code),
      role
    });

    if (res.error) {
      setError(res.error.message);
      return;
    }

    await fetchAll();
  }

  async function updateAssignment(id: string, role: PlayerAlliance["role"]) {
    setError(null);

    const res = await supabase.from("player_alliances").update({ role }).eq("id", id);
    if (res.error) {
      setError(res.error.message);
      return;
    }

    await fetchAll();
  }

  async function removeAssignment(id: string) {
    const ok = confirm("Remove this alliance assignment?");
    if (!ok) return;

    setError(null);
    const res = await supabase.from("player_alliances").delete().eq("id", id);
    if (res.error) {
      setError(res.error.message);
      return;
    }

    await fetchAll();
  }

  async function deletePlayer(id: string) {
    const ok = confirm("Delete player roster entry? (Removes all their assignments too.)");
    if (!ok) return;

    setError(null);
    const res = await supabase.from("players").delete().eq("id", id);
    if (res.error) {
      setError(res.error.message);
      return;
    }

    await fetchAll();
  }

  async function linkAndSync() {
    setError(null);

    const pid = linkPlayerId.trim();
    const uid = linkUserId.trim();
    if (!pid) return alert("Player ID required.");
    if (!uid) return alert("User UUID required.");

    const link = await supabase
      .from("player_auth_links")
      .upsert({ player_id: pid, user_id: uid }, { onConflict: "player_id" });

    if (link.error) return setError(link.error.message);

    const pa = await supabase
      .from("player_alliances")
      .select("alliance_code, role")
      .eq("player_id", pid);

    if (pa.error) return setError(pa.error.message);

    const membershipRows = (pa.data ?? []).map((r: any) => ({
      alliance_id: r.alliance_code,
      user_id: uid,
      role: r.role
    }));

    if (membershipRows.length) {
      const up = await supabase
        .from("alliance_memberships")
        .upsert(membershipRows, { onConflict: "alliance_id,user_id" });

      if (up.error) return setError(up.error.message);
    }

    alert("Linked + synced memberships.");
  }

  if (!userId) {
    return <div style={{ padding: 24 }}><h2>🧟 Owner — Players</h2><div>You must be logged in.</div></div>;
  }

  if (!isAdmin) {
    return <div style={{ padding: 24 }}><h2>🧟 Owner — Players</h2><div>Access denied (not an admin).</div></div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>🧟 Owner — Players</h2>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <a href="/owner">← Back to Owner</a>
        <a href="/owner/alliances">Alliances</a>
        <a href="/owner/memberships">Memberships</a>
      </div>

      {error ? (
        <div style={{ border: "1px solid #733", borderRadius: 8, padding: 10, marginBottom: 12 }}>{error}</div>
      ) : null}

      <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12, marginBottom: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Add Player (Game Name + Alliance Tag)</div>

        <div style={{ display: "grid", gap: 8, maxWidth: 820 }}>
          <input placeholder='Game Name (ex: "Seven")' value={gameName} onChange={(e) => setGameName(e.target.value)} />
          <input placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} />

          <select value={addAlliance} onChange={(e) => setAddAlliance(e.target.value)}>
            <option value="">Select alliance…</option>
            {alliances.filter(a => a.enabled).map((a) => (
              <option key={a.code} value={a.code}>{a.code} — {a.name}</option>
            ))}
          </select>

          <select value={addRole} onChange={(e) => setAddRole(e.target.value as any)}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>

          <button onClick={addPlayer}>Create Player</button>
        </div>
      </div>

      <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12, marginBottom: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Link Player → Supabase User UUID + Sync Roles</div>

        <div style={{ display: "grid", gap: 8, maxWidth: 820 }}>
          <input placeholder="Player ID (uuid)" value={linkPlayerId} onChange={(e) => setLinkPlayerId(e.target.value)} />
          <input placeholder="User UUID (auth.users.id)" value={linkUserId} onChange={(e) => setLinkUserId(e.target.value)} />
          <button onClick={linkAndSync}>Link + Sync Memberships</button>
          <div style={{ opacity: 0.75, fontSize: 12 }}>
            No auto-assign on OAuth. Owner manually links, then memberships are created for RLS access.
          </div>
        </div>
      </div>

      <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12, marginBottom: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Search Players</div>
        <input placeholder="Search game name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div style={{ marginTop: 10 }}>
          <button onClick={fetchAll}>Refresh</button>
        </div>
      </div>

      <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Roster (latest 200)</div>

        {filteredPlayers.length === 0 ? (
          <div style={{ opacity: 0.8 }}>No players found.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filteredPlayers.map((p) => {
              const asn = assignments[p.id] ?? [];
              return (
                <div key={p.id} style={{ border: "1px solid #222", borderRadius: 10, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900 }}>{p.game_name}</div>
                    <button onClick={() => deletePlayer(p.id)}>Delete Player</button>
                  </div>

                  <div style={{ marginTop: 6, opacity: 0.8, fontSize: 12 }}>
                    Player ID: <code>{p.id}</code>
                  </div>

                  {p.note ? <div style={{ marginTop: 6, opacity: 0.85 }}>Note: {p.note}</div> : null}

                  <div style={{ marginTop: 10, fontWeight: 800 }}>Alliance Assignments</div>

                  {asn.length === 0 ? (
                    <div style={{ opacity: 0.8, marginTop: 6 }}>None yet.</div>
                  ) : (
                    <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                      {asn.map((a) => (
                        <div key={a.id} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                          <div style={{ fontWeight: 800 }}>{a.alliance_code}</div>
                          <select value={a.role} onChange={(e) => updateAssignment(a.id, e.target.value as any)}>
                            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <button onClick={() => removeAssignment(a.id)}>Remove</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const code = e.target.value;
                        if (!code) return;
                        addAssignment(p.id, code, "member");
                        e.currentTarget.value = "";
                      }}
                    >
                      <option value="">Add alliance…</option>
                      {alliances.filter(a => a.enabled).map((a) => (
                        <option key={a.code} value={a.code}>{a.code} — {a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
