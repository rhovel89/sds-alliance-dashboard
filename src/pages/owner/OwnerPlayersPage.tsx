import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Alliance = { code: string; name?: string | null; enabled?: boolean | null };
type Player = {
  id: string;
  game_name?: string | null;
  name?: string | null;
  note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};
type PlayerAlliance = {
  id: string;
  player_id: string;
  alliance_code: string;
  role: "owner" | "r5" | "r4" | "member" | "viewer";
};
type PlayerAuthLink = {
  player_id: string;
  user_id: string;
};

const ROLES: PlayerAlliance["role"][] = ["member", "viewer", "r5", "r4", "owner"];

function s(v: any) {
  return v === null || v === undefined ? "" : String(v);
}

function normCode(v: string) {
  return s(v).trim().toUpperCase();
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

function badgeStyle(ok?: boolean): React.CSSProperties {
  return {
    fontSize: 12,
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: ok ? "rgba(120,255,120,0.08)" : "rgba(255,255,255,0.05)",
    color: ok ? "#aaffc7" : "rgba(255,255,255,0.88)",
    fontWeight: 800,
  };
}

function sectionStyle(): React.CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 14,
    padding: 14,
    background: "rgba(255,255,255,0.03)",
  };
}

export default function OwnerPlayersPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [alliances, setAlliances] = useState<Alliance[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [assignments, setAssignments] = useState<Record<string, PlayerAlliance[]>>({});
  const [links, setLinks] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [allianceFilter, setAllianceFilter] = useState("ALL");

  const [gameName, setGameName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [note, setNote] = useState("");
  const [addAlliance, setAddAlliance] = useState("");
  const [addRole, setAddRole] = useState<PlayerAlliance["role"]>("member");

  const [linkPlayerId, setLinkPlayerId] = useState("");
  const [linkUserId, setLinkUserId] = useState("");

  const title = useMemo(() => "🧟 Owner — Players", []);

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
    setLoading(true);
    setError(null);

    const a = await supabase.from("alliances").select("code, name, enabled").order("code");
    if (a.error) {
      setLoading(false);
      return setError(a.error.message);
    }
    setAlliances((a.data ?? []) as any);

    const p = await supabase
      .from("players")
      .select("id, game_name, name, note, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (p.error) {
      setLoading(false);
      return setError(p.error.message);
    }

    const playerRows = (p.data ?? []) as any as Player[];
    setPlayers(playerRows);

    const ids = playerRows.map((x) => x.id);
    if (!ids.length) {
      setAssignments({});
      setLinks({});
      setLoading(false);
      return;
    }

    const pa = await supabase
      .from("player_alliances")
      .select("id, player_id, alliance_code, role")
      .in("player_id", ids);

    if (pa.error) {
      setLoading(false);
      return setError(pa.error.message);
    }

    const grouped: Record<string, PlayerAlliance[]> = {};
    (pa.data ?? []).forEach((row: any) => {
      grouped[row.player_id] = grouped[row.player_id] ?? [];
      grouped[row.player_id].push(row);
    });

    Object.keys(grouped).forEach((k) => {
      grouped[k].sort((x, y) => s(x.alliance_code).localeCompare(s(y.alliance_code)));
    });

    setAssignments(grouped);

    const l = await supabase
      .from("player_auth_links")
      .select("player_id, user_id")
      .in("player_id", ids);

    if (l.error) {
      setLoading(false);
      return setError(l.error.message);
    }

    const linkMap: Record<string, string> = {};
    (l.data ?? []).forEach((row: PlayerAuthLink) => {
      linkMap[row.player_id] = row.user_id;
    });
    setLinks(linkMap);

    setLoading(false);
  }

  useEffect(() => {
    void boot();
  }, []);

  const allianceOptions = useMemo(() => {
    const set = new Set<string>();
    alliances.forEach((a) => {
      const code = normCode(s(a.code));
      if (code) set.add(code);
    });
    Object.values(assignments).forEach((list) => {
      list.forEach((a) => {
        const code = normCode(s(a.alliance_code));
        if (code) set.add(code);
      });
    });
    return ["ALL", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [alliances, assignments]);

  const filteredPlayers = useMemo(() => {
    const q = s(search).trim().toLowerCase();

    return players.filter((p) => {
      const playerAssignments = assignments[p.id] ?? [];
      const linkedUserId = s(links[p.id]);
      const allianceBlob = playerAssignments.map((a) => s(a.alliance_code)).join(" ");
      const haystack = [
        s(p.game_name),
        s(p.name),
        s(p.note),
        s(p.id),
        linkedUserId,
        allianceBlob,
      ]
        .join(" ")
        .toLowerCase();

      const searchOk = !q || haystack.includes(q);
      const allianceOk =
        allianceFilter === "ALL" ||
        playerAssignments.some((a) => normCode(s(a.alliance_code)) === allianceFilter);

      return searchOk && allianceOk;
    });
  }, [players, assignments, links, search, allianceFilter]);

  const linkedCount = useMemo(() => {
    return players.filter((p) => !!s(links[p.id])).length;
  }, [players, links]);

  const visibleLinkedCount = useMemo(() => {
    return filteredPlayers.filter((p) => !!s(links[p.id])).length;
  }, [filteredPlayers, links]);

  async function addPlayer() {
    setError(null);

    const gn = s(gameName).trim();
    const dn = s(displayName).trim();
    if (!gn && !dn) return alert("Game Name or Display Name required.");

    const allianceCode = normCode(addAlliance);
    if (!allianceCode) return alert("Alliance code required.");

    const created = await supabase
      .from("players")
      .insert({
        game_name: gn || null,
        name: dn || null,
        note: s(note).trim() || null,
      })
      .select("id")
      .maybeSingle();

    if (created.error || !created.data) {
      setError(created.error?.message ?? "Failed to create player.");
      return;
    }

    const pa = await supabase.from("player_alliances").insert({
      player_id: created.data.id,
      alliance_code: allianceCode,
      role: addRole,
    });

    if (pa.error) {
      setError(pa.error.message);
      return;
    }

    setGameName("");
    setDisplayName("");
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
      role,
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

  async function linkPlayer() {
    setError(null);

    const pid = s(linkPlayerId).trim();
    const uid = s(linkUserId).trim();
    if (!pid) return alert("Player ID required.");
    if (!uid) return alert("User UUID required.");

    const link = await supabase
      .from("player_auth_links")
      .upsert({ player_id: pid, user_id: uid }, { onConflict: "player_id" });

    if (link.error) {
      setError(link.error.message);
      return;
    }

    alert("Linked. Roles now auto-sync to dashboard access automatically.");
    await fetchAll();
  }

  async function unlinkPlayer(player_id: string) {
    const ok = confirm("Unlink this player from their Supabase user?");
    if (!ok) return;

    setError(null);
    const res = await supabase.from("player_auth_links").delete().eq("player_id", player_id);
    if (res.error) {
      setError(res.error.message);
      return;
    }

    await fetchAll();
  }

  async function copyText(text: string) {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      alert("Copied.");
    } catch {
      alert("Copy failed — copy manually.");
    }
  }

  if (!userId) {
    return (
      <div style={{ padding: 24 }}>
        <h2>{title}</h2>
        <div>You must be logged in.</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <h2>{title}</h2>
        <div>Access denied (not an admin).</div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: 1440, margin: "0 auto", padding: 24, display: "grid", gap: 12 }}>
      <div
        className="zombie-card"
        style={{
          padding: 20,
          background: "linear-gradient(180deg, rgba(16,20,26,0.98), rgba(8,10,14,0.94))",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <div style={badgeStyle(true)}>OWNER</div>
              <div style={badgeStyle()}>PLAYERS</div>
              <div style={badgeStyle()}>ALLIANCE FILTERS</div>
            </div>
            <div style={{ fontSize: 30, fontWeight: 950, lineHeight: 1.05 }}>Owner Players Directory</div>
            <div style={{ opacity: 0.84, marginTop: 10, lineHeight: 1.7, maxWidth: 900 }}>
              Clean owner view of roster players, their alliance assignments, and linked user IDs. Search fast, filter by alliance, and jump into dossiers.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a className="zombie-btn" style={{ padding: "10px 12px", textDecoration: "none" }} href="/owner">Back to Owner</a>
            <a className="zombie-btn" style={{ padding: "10px 12px", textDecoration: "none" }} href="/owner/dossiers">Dossiers</a>
            <a className="zombie-btn" style={{ padding: "10px 12px", textDecoration: "none" }} href="/owner/alliances">Alliances</a>
            <a className="zombie-btn" style={{ padding: "10px 12px", textDecoration: "none" }} href="/owner/memberships">Memberships</a>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => void fetchAll()} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div
          style={{
            border: "1px solid rgba(255,120,120,0.30)",
            background: "rgba(255,120,120,0.08)",
            borderRadius: 12,
            padding: 12,
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <div className="zombie-card" style={{ padding: 14 }}>
          <div style={{ opacity: 0.7, fontSize: 12, fontWeight: 900 }}>TOTAL PLAYERS</div>
          <div style={{ fontSize: 26, fontWeight: 950, marginTop: 8 }}>{players.length}</div>
        </div>
        <div className="zombie-card" style={{ padding: 14 }}>
          <div style={{ opacity: 0.7, fontSize: 12, fontWeight: 900 }}>VISIBLE NOW</div>
          <div style={{ fontSize: 26, fontWeight: 950, marginTop: 8 }}>{filteredPlayers.length}</div>
        </div>
        <div className="zombie-card" style={{ padding: 14 }}>
          <div style={{ opacity: 0.7, fontSize: 12, fontWeight: 900 }}>LINKED USERS</div>
          <div style={{ fontSize: 26, fontWeight: 950, marginTop: 8 }}>{linkedCount}</div>
        </div>
        <div className="zombie-card" style={{ padding: 14 }}>
          <div style={{ opacity: 0.7, fontSize: 12, fontWeight: 900 }}>VISIBLE LINKED</div>
          <div style={{ fontSize: 26, fontWeight: 950, marginTop: 8 }}>{visibleLinkedCount}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }}>
        <div style={sectionStyle()}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Add Player</div>
          <div style={{ display: "grid", gap: 8 }}>
            <input
              className="zombie-input"
              placeholder='Game Name (ex: "Seven")'
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              style={{ padding: "10px 12px" }}
            />
            <input
              className="zombie-input"
              placeholder='Display Name (optional)'
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={{ padding: "10px 12px" }}
            />
            <input
              className="zombie-input"
              placeholder="Optional note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ padding: "10px 12px" }}
            />

            <select className="zombie-input" value={addAlliance} onChange={(e) => setAddAlliance(e.target.value)} style={{ padding: "10px 12px" }}>
              <option value="">Select alliance…</option>
              {alliances.filter((a) => a.enabled !== false).map((a) => (
                <option key={String(a.code)} value={String(a.code)}>
                  {String(a.code)} — {String(a.name || a.code)}
                </option>
              ))}
            </select>

            <select className="zombie-input" value={addRole} onChange={(e) => setAddRole(e.target.value as any)} style={{ padding: "10px 12px" }}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: 900 }} onClick={() => void addPlayer()}>
              Create Player
            </button>
          </div>
        </div>

        <div style={sectionStyle()}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Link Player → User UUID</div>
          <div style={{ display: "grid", gap: 8 }}>
            <input
              className="zombie-input"
              placeholder="Player ID (uuid)"
              value={linkPlayerId}
              onChange={(e) => setLinkPlayerId(e.target.value)}
              style={{ padding: "10px 12px" }}
            />
            <input
              className="zombie-input"
              placeholder="User UUID (auth.users.id)"
              value={linkUserId}
              onChange={(e) => setLinkUserId(e.target.value)}
              style={{ padding: "10px 12px" }}
            />
            <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: 900 }} onClick={() => void linkPlayer()}>
              Link Player
            </button>
            <div style={{ opacity: 0.72, fontSize: 12 }}>
              Linking keeps your existing roster-driven flow and does not change the page structure.
            </div>
          </div>
        </div>
      </div>

      <div style={sectionStyle()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 900 }}>Filters</div>
            <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4 }}>
              Search by player name, note, player ID, linked user ID, or alliance code.
            </div>
          </div>

          <button
            className="zombie-btn"
            style={{ padding: "8px 10px", fontSize: 12 }}
            onClick={() => {
              setSearch("");
              setAllianceFilter("ALL");
            }}
          >
            Reset Filters
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 220px", gap: 10, marginTop: 12 }}>
          <input
            className="zombie-input"
            placeholder="Search players, UUIDs, notes, alliances..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "10px 12px" }}
          />
          <select
            className="zombie-input"
            value={allianceFilter}
            onChange={(e) => setAllianceFilter(e.target.value)}
            style={{ padding: "10px 12px" }}
          >
            {allianceOptions.map((code) => (
              <option key={code} value={code}>
                {code === "ALL" ? "All Alliances" : code}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={sectionStyle()}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Roster ({filteredPlayers.length})</div>

        {filteredPlayers.length === 0 ? (
          <div style={{ opacity: 0.8 }}>No players found.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filteredPlayers.map((p) => {
              const asn = assignments[p.id] ?? [];
              const linkedUserId = links[p.id] ?? null;
              const primaryName = s(p.game_name || p.name || "Unnamed Player");
              const secondaryName =
                s(p.name) && s(p.name) !== s(p.game_name) ? s(p.name) : "";

              return (
                <div
                  key={p.id}
                  className="zombie-card"
                  style={{
                    padding: 14,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(0,0,0,0.20)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <div style={{ fontWeight: 950, fontSize: 18 }}>{primaryName}</div>
                        <span style={badgeStyle(!!linkedUserId)}>{linkedUserId ? "Linked" : "Not Linked"}</span>
                      </div>

                      {secondaryName ? (
                        <div style={{ opacity: 0.78, marginTop: 4 }}>{secondaryName}</div>
                      ) : null}

                      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.82, lineHeight: 1.6 }}>
                        Player ID: <code>{p.id}</code><br />
                        Created: {fmtDate(p.created_at)}
                        {p.updated_at ? <> • Updated: {fmtDate(p.updated_at)}</> : null}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="zombie-btn" style={{ padding: "8px 10px" }} onClick={() => setLinkPlayerId(p.id)}>
                        Use for Link
                      </button>
                      <a
                        className="zombie-btn"
                        style={{ padding: "8px 10px", textDecoration: "none" }}
                        href={`/dossier/${encodeURIComponent(p.id)}`}
                      >
                        Open Dossier
                      </a>
                      <button className="zombie-btn" style={{ padding: "8px 10px" }} onClick={() => void deletePlayer(p.id)}>
                        Delete
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: 10, fontSize: 13 }}>
                    <strong>Linked User:</strong>{" "}
                    {linkedUserId ? (
                      <>
                        <code>{linkedUserId}</code>
                        <button className="zombie-btn" style={{ padding: "6px 8px", marginLeft: 10, fontSize: 12 }} onClick={() => void copyText(linkedUserId)}>
                          Copy
                        </button>
                        <button className="zombie-btn" style={{ padding: "6px 8px", marginLeft: 8, fontSize: 12 }} onClick={() => void unlinkPlayer(p.id)}>
                          Unlink
                        </button>
                      </>
                    ) : (
                      <span style={{ opacity: 0.75 }}>Not linked</span>
                    )}
                  </div>

                  {p.note ? (
                    <div style={{ marginTop: 10, opacity: 0.88 }}>
                      <strong>Note:</strong> {p.note}
                    </div>
                  ) : null}

                  <div style={{ marginTop: 14, fontWeight: 900 }}>Alliance Assignments</div>

                  {asn.length === 0 ? (
                    <div style={{ opacity: 0.78, marginTop: 6 }}>None yet.</div>
                  ) : (
                    <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                      {asn.map((a) => (
                        <div
                          key={a.id}
                          style={{
                            display: "flex",
                            gap: 10,
                            flexWrap: "wrap",
                            alignItems: "center",
                            padding: 10,
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.08)",
                            background: "rgba(255,255,255,0.02)",
                          }}
                        >
                          <div style={{ minWidth: 80, fontWeight: 900 }}>{a.alliance_code}</div>

                          <select
                            className="zombie-input"
                            value={a.role}
                            onChange={(e) => void updateAssignment(a.id, e.target.value as any)}
                            style={{ padding: "8px 10px", minWidth: 120 }}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>

                          <button className="zombie-btn" style={{ padding: "8px 10px" }} onClick={() => void removeAssignment(a.id)}>
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <select
                      className="zombie-input"
                      defaultValue=""
                      style={{ padding: "10px 12px", minWidth: 260 }}
                      onChange={(e) => {
                        const code = e.target.value;
                        if (!code) return;
                        void addAssignment(p.id, code, "member");
                        e.currentTarget.value = "";
                      }}
                    >
                      <option value="">Add alliance…</option>
                      {alliances.filter((a) => a.enabled !== false).map((a) => (
                        <option key={String(a.code)} value={String(a.code)}>
                          {String(a.code)} — {String(a.name || a.code)}
                        </option>
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

