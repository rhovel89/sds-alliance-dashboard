import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type AllianceRow = { code: string; name: string | null };
type PlayerRow = {
  id: string;
  game_name?: string | null;
  name?: string | null;
  auth_user_id?: string | null;
};

type MembershipRow = {
  id: string;
  player_id: string;
  alliance_code: string;
  role: "owner" | "r5" | "r4" | "member" | "viewer";
};

const ROLES: MembershipRow["role"][] = ["owner", "r5", "r4", "member", "viewer"];

function displayPlayerName(p: PlayerRow) {
  return (p.game_name || p.name || "(no name)").trim();
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    alert("Copied!");
  } catch {
    // fallback
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    alert("Copied!");
  }
}

export default function OwnerMembershipManagerPage() {
  const [alliances, setAlliances] = useState<AllianceRow[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);

  const [selectedAlliance, setSelectedAlliance] = useState<string>("");

  const [addPlayerId, setAddPlayerId] = useState<string>("");
  const [addRole, setAddRole] = useState<MembershipRow["role"]>("member");

  const [linkPlayerId, setLinkPlayerId] = useState<string>("");
  const [linkUserUuid, setLinkUserUuid] = useState<string>("");

  const [search, setSearch] = useState("");

  const playersById = useMemo(() => {
    const m = new Map<string, PlayerRow>();
    for (const p of players) m.set(p.id, p);
    return m;
  }, [players]);

  const filteredPlayers = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return players;
    return players.filter((p) => displayPlayerName(p).toLowerCase().includes(s));
  }, [players, search]);

  const refetchAll = async () => {
    const [{ data: a }, { data: p }] = await Promise.all([
      supabase.from("alliances").select("code,name").order("code", { ascending: true }),
      supabase.from("players").select("id,game_name,name,auth_user_id").order("game_name", { ascending: true }),
    ]);

    setAlliances((a || []) as AllianceRow[]);
    setPlayers((p || []) as PlayerRow[]);
  };

  const refetchMemberships = async (code: string) => {
    if (!code) return setMemberships([]);
    const { data, error } = await supabase
      .from("player_alliances")
      .select("id,player_id,alliance_code,role")
      .eq("alliance_code", code)
      .order("role", { ascending: true });

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    setMemberships((data || []) as MembershipRow[]);
  };

  useEffect(() => {
    refetchAll();
  }, []);

  useEffect(() => {
    if (selectedAlliance) refetchMemberships(selectedAlliance);
  }, [selectedAlliance]);

  const addMembership = async () => {
    if (!selectedAlliance) return alert("Select an alliance first.");
    if (!addPlayerId) return alert("Select a player.");

    const { error } = await supabase.from("player_alliances").insert({
      player_id: addPlayerId,
      alliance_code: selectedAlliance,
      role: addRole,
    });

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    setAddPlayerId("");
    setAddRole("member");
    await refetchMemberships(selectedAlliance);
  };

  const updateRole = async (rowId: string, role: MembershipRow["role"]) => {
    const { error } = await supabase.from("player_alliances").update({ role }).eq("id", rowId);
    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }
    await refetchMemberships(selectedAlliance);
  };

  const removeMembership = async (rowId: string) => {
    if (!confirm("Remove this player from the alliance?")) return;
    const { error } = await supabase.from("player_alliances").delete().eq("id", rowId);
    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }
    await refetchMemberships(selectedAlliance);
  };

  const linkUser = async () => {
    const userId = linkUserUuid.trim();
    if (!linkPlayerId) return alert("Select a player to link.");
    if (!userId) return alert("Paste a User UUID.");

    const { error } = await supabase.from("players").update({ auth_user_id: userId }).eq("id", linkPlayerId);
    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    setLinkUserUuid("");
    await refetchAll();
  };

  const unlinkUser = async (playerId: string) => {
    if (!confirm("Unlink this user from the player?")) return;
    const { error } = await supabase.from("players").update({ auth_user_id: null }).eq("id", playerId);
    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }
    await refetchAll();
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>🧟 Owner — Membership Manager</h2>

      <div style={{ display: "grid", gap: 12, maxWidth: 900 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <strong>Select Alliance</strong>
          <select value={selectedAlliance} onChange={(e) => setSelectedAlliance(e.target.value)}>
            <option value="">-- Select --</option>
            {alliances.map((a) => (
              <option key={a.code} value={a.code}>
                {a.code} — {a.name || a.code}
              </option>
            ))}
          </select>
        </div>

        {selectedAlliance ? (
          <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>Roster — {selectedAlliance}</h3>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Player</span>
                <select value={addPlayerId} onChange={(e) => setAddPlayerId(e.target.value)}>
                  <option value="">-- Select player --</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {displayPlayerName(p)}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span>Role</span>
                <select value={addRole} onChange={(e) => setAddRole(e.target.value as any)}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>

              <button onClick={addMembership}>➕ Add Member</button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {memberships.length === 0 ? (
                <div style={{ opacity: 0.75 }}>No members yet.</div>
              ) : (
                memberships.map((m) => {
                  const p = playersById.get(m.player_id);
                  const name = p ? displayPlayerName(p) : m.player_id;
                  return (
                    <div
                      key={m.id}
                      style={{ border: "1px solid #2a2a2a", borderRadius: 10, padding: 10, display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}
                    >
                      <div>
                        <div style={{ fontWeight: 800 }}>{name}</div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>
                          Player ID: {m.player_id}
                        </div>
                        {p?.auth_user_id ? (
                          <div style={{ fontSize: 12, opacity: 0.8 }}>
                            Linked User: {p.auth_user_id}
                          </div>
                        ) : null}
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <select value={m.role} onChange={(e) => updateRole(m.id, e.target.value as any)}>
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        <button onClick={() => removeMembership(m.id)}>🗑 Remove</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : null}

        <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Link / Unlink User (Auth UUID)</h3>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Player</span>
              <select value={linkPlayerId} onChange={(e) => setLinkPlayerId(e.target.value)}>
                <option value="">-- Select player --</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {displayPlayerName(p)}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>User UUID</span>
              <input value={linkUserUuid} onChange={(e) => setLinkUserUuid(e.target.value)} placeholder="Paste Supabase auth user id" />
            </label>

            <button onClick={linkUser}>🔗 Link</button>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <strong>Players</strong>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search game name..." />
              <button onClick={refetchAll}>↻ Refresh</button>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {filteredPlayers.map((p) => (
                <div key={p.id} style={{ border: "1px solid #2a2a2a", borderRadius: 10, padding: 10, display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{displayPlayerName(p)}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>Player ID: {p.id}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      User UUID: {p.auth_user_id || "—"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "end" }}>
                    {p.auth_user_id ? (
                      <>
                        <button onClick={() => copyText(p.auth_user_id!)}>📋 Copy User UUID</button>
                        <button onClick={() => unlinkUser(p.id)}>⛓ Unlink</button>
                      </>
                    ) : (
                      <span style={{ opacity: 0.75 }}>Not linked</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
              Tip: You can get a user UUID from Supabase Dashboard → Authentication → Users (ID column).
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, opacity: 0.75 }}>
          Direct link: <code>/owner/membership</code>
        </div>
      </div>
    </div>
  );
}
