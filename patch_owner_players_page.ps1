$ErrorActionPreference = "Stop"

$path = "src/pages/owner/OwnerPlayersPage.tsx"
if (-not (Test-Path $path)) { throw "Missing file: $path" }

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = "$path.bak-$stamp"
Copy-Item $path $backup -Force
Write-Host "Backup created: $backup"

$content = @'
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Alliance = { code: string; name: string; enabled: boolean };
type Player = {
  id: string;
  game_name: string;
  name?: string | null;
  note: string | null;
  created_at: string;
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

type PlayerHqSummary = {
  id: string;
  profile_id: string;
  alliance_code?: string | null;
  hq_name?: string | null;
  hq_level?: number | null;
  is_primary?: boolean | null;
  troop_type?: string | null;
  troop_tier?: string | null;
  troop_size?: number | null;
  march_size?: number | null;
  rally_size?: number | null;
  coord_x?: number | null;
  coord_y?: number | null;
  updated_at?: string | null;
};

const ROLES: PlayerAlliance["role"][] = ["member", "viewer", "r5", "r4", "owner"];

function normCode(v: string) {
  return v.trim().toUpperCase();
}

function s(v: unknown) {
  return v === null || v === undefined ? "" : String(v);
}

export default function OwnerPlayersPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alliances, setAlliances] = useState<Alliance[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [assignments, setAssignments] = useState<Record<string, PlayerAlliance[]>>({});
  const [links, setLinks] = useState<Record<string, string>>({});
  const [hqRowsByPlayer, setHqRowsByPlayer] = useState<Record<string, PlayerHqSummary[]>>({});
  const [hqLoading, setHqLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [allianceFilter, setAllianceFilter] = useState("");
  const [gameName, setGameName] = useState("");
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
    setError(null);
    setHqLoading(true);

    const a = await supabase.from("alliances").select("code, name, enabled").order("code");
    if (a.error) {
      setHqLoading(false);
      return setError(a.error.message);
    }
    setAlliances((a.data ?? []) as Alliance[]);

    const p = await supabase
      .from("players")
      .select("id, game_name, name, note, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (p.error) {
      setHqLoading(false);
      return setError(p.error.message);
    }

    const playerRows = (p.data ?? []) as Player[];
    setPlayers(playerRows);

    const ids = playerRows.map((x) => x.id);
    if (!ids.length) {
      setAssignments({});
      setLinks({});
      setHqRowsByPlayer({});
      setHqLoading(false);
      return;
    }

    const pa = await supabase
      .from("player_alliances")
      .select("id, player_id, alliance_code, role")
      .in("player_id", ids);

    if (pa.error) {
      setHqLoading(false);
      return setError(pa.error.message);
    }

    const grouped: Record<string, PlayerAlliance[]> = {};
    (pa.data ?? []).forEach((row: any) => {
      grouped[row.player_id] = grouped[row.player_id] ?? [];
      grouped[row.player_id].push(row);
    });

    Object.keys(grouped).forEach((k) => {
      grouped[k].sort((x, y) => x.alliance_code.localeCompare(y.alliance_code));
    });

    setAssignments(grouped);

    const l = await supabase
      .from("player_auth_links")
      .select("player_id, user_id")
      .in("player_id", ids);

    if (l.error) {
      setHqLoading(false);
      return setError(l.error.message);
    }

    const linkMap: Record<string, string> = {};
    (l.data ?? []).forEach((row: PlayerAuthLink) => {
      linkMap[row.player_id] = row.user_id;
    });
    setLinks(linkMap);

    try {
      const hqRes = await supabase
        .from("player_alliance_hqs")
        .select("id, profile_id, alliance_code, hq_name, hq_level, is_primary, troop_type, troop_tier, troop_size, march_size, rally_size, coord_x, coord_y, updated_at")
        .in("profile_id", ids);

      const hqMap: Record<string, PlayerHqSummary[]> = {};

      if (!hqRes.error) {
        (hqRes.data ?? []).forEach((row: any) => {
          const key = String(row.profile_id || "");
          if (!key) return;
          hqMap[key] = hqMap[key] ?? [];
          hqMap[key].push(row as PlayerHqSummary);
        });

        Object.keys(hqMap).forEach((k) => {
          hqMap[k].sort((a, b) => {
            const ap = a.is_primary ? 1 : 0;
            const bp = b.is_primary ? 1 : 0;
            if (ap !== bp) return bp - ap;
            const al = Number(a.hq_level ?? 0);
            const bl = Number(b.hq_level ?? 0);
            if (al !== bl) return bl - al;
            return s(a.hq_name).localeCompare(s(b.hq_name));
          });
        });
      }

      setHqRowsByPlayer(hqMap);
    } catch (e) {
      console.error("HQ load failed", e);
      setHqRowsByPlayer({});
    } finally {
      setHqLoading(false);
    }
  }

  useEffect(() => {
    boot();
  }, []);

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return players.filter((p) => {
      const asn = assignments[p.id] ?? [];
      const linkedUserId = links[p.id] ?? "";
      const hqs = hqRowsByPlayer[p.id] ?? [];

      const allianceOk =
        !allianceFilter ||
        asn.some((a) => normCode(String(a.alliance_code || "")) === normCode(allianceFilter));

      if (!allianceOk) return false;
      if (!q) return true;

      const haystack = [
        p.game_name,
        p.name,
        p.note,
        p.id,
        linkedUserId,
        ...asn.map((a) => `${a.alliance_code} ${a.role}`),
        ...hqs.map((h) => [h.hq_name, h.hq_level, h.alliance_code, h.troop_type, h.troop_tier, h.coord_x, h.coord_y].join(" ")),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [players, search, assignments, links, allianceFilter, hqRowsByPlayer]);

  async function addPlayer() {
    setError(null);
    const gn = gameName.trim();
    if (!gn) return alert("Game Name required.");

    const allianceCode = normCode(addAlliance);
    if (!allianceCode) return alert("Alliance code required (ex: SDS).");

    const created = await supabase
      .from("players")
      .insert({ game_name: gn, note: note.trim() || null })
      .select("id")
      .maybeSingle();

    if (created.error || !created.data) {
      setError(created.error?.message ?? "Failed to create player.");
      return;
    }

    const pa2 = await supabase.from("player_alliances").insert({
      player_id: created.data.id,
      alliance_code: allianceCode,
      role: addRole,
    });

    if (pa2.error) {
      setError(pa2.error.message);
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
    const pid = linkPlayerId.trim();
    const uid = linkUserId.trim();
    if (!pid) return alert("Player ID required.");
    if (!uid) return alert("User UUID required.");

    const link = await supabase
      .from("player_auth_links")
      .upsert({ player_id: pid, user_id: uid }, { onConflict: "player_id" });

    if (link.error) return setError(link.error.message);
    alert("Linked. Roles now auto-sync to dashboard access automatically.");
    await fetchAll();
  }

  async function unlinkPlayer(player_id: string) {
    const ok = confirm("Unlink this player from their Supabase user? (Roster-managed dashboard access will be removed automatically.)");
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
      alert("Copied User UUID.");
    } catch (e) {
      console.error(e);
      alert("Copy failed — please copy manually.");
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
    <div style={{ padding: 24 }}>
      <h2>{title}</h2>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <a href="/owner">← Back to Owner</a>
        <a href="/owner/alliances">Alliances</a>
        <a href="/owner/memberships">Memberships</a>
      </div>

      {error ? (
        <div style={{ border: "1px solid #733", borderRadius: 8, padding: 10, marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12, marginBottom: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Add Player (Game Name + Alliance Tag)</div>
        <div style={{ display: "grid", gap: 8, maxWidth: 820 }}>
          <input placeholder='Game Name (ex: "Seven")' value={gameName} onChange={(e) => setGameName(e.target.value)} />
          <input placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} />
          <select value={addAlliance} onChange={(e) => setAddAlliance(e.target.value)}>
            <option value="">Select alliance…</option>
            {alliances.filter((a) => a.enabled).map((a) => (
              <option key={a.code} value={a.code}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
          <select value={addRole} onChange={(e) => setAddRole(e.target.value as PlayerAlliance["role"])}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button onClick={addPlayer}>Create Player</button>
        </div>
      </div>

      <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12, marginBottom: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Link Player → Supabase User UUID</div>
        <div style={{ display: "grid", gap: 8, maxWidth: 820 }}>
          <input placeholder="Player ID (uuid) — tip: click 'Use for Link' on a player card" value={linkPlayerId} onChange={(e) => setLinkPlayerId(e.target.value)} />
          <input placeholder="User UUID (auth.users.id)" value={linkUserId} onChange={(e) => setLinkUserId(e.target.value)} />
          <button onClick={linkPlayer}>Link Player</button>
          <div style={{ opacity: 0.75, fontSize: 12 }}>
            No auto-assign on OAuth. Linking triggers DB auto-sync for dashboard access. Unlink removes roster-managed access automatically.
          </div>
        </div>
      </div>

      <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12, marginBottom: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Search / Filter Players</div>
        <input placeholder="Search name, alliance, user id, HQ, coords…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
          <select value={allianceFilter} onChange={(e) => setAllianceFilter(e.target.value)}>
            <option value="">All alliances</option>
            {alliances.map((a) => (
              <option key={a.code} value={a.code}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
          <div style={{ opacity: 0.75, fontSize: 12 }}>
            Showing {filteredPlayers.length} of {players.length} players
          </div>
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={fetchAll}>Refresh</button>
          <button onClick={() => { setSearch(""); setAllianceFilter(""); }}>Reset Filters</button>
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
              const linkedUserId = links[p.id] ?? null;
              const hqs = hqRowsByPlayer[p.id] ?? [];
              const primaryHq = hqs.find((h) => h.is_primary === true) ?? hqs[0] ?? null;

              return (
                <div key={p.id} style={{ border: "1px solid #222", borderRadius: 10, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900 }}>{p.game_name || p.name || "Unnamed Player"}</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button onClick={() => setLinkPlayerId(p.id)}>Use for Link</button>
                      <a href={`/dossier/${encodeURIComponent(p.id)}`}>Open Dossier</a>
                      <button onClick={() => deletePlayer(p.id)}>Delete Player</button>
                    </div>
                  </div>

                  <div style={{ marginTop: 6, opacity: 0.8, fontSize: 12 }}>
                    Player ID: <code>{p.id}</code>
                  </div>

                  <div style={{ marginTop: 6, opacity: 0.9, fontSize: 12 }}>
                    Linked User:{" "}
                    {linkedUserId ? (
                      <>
                        <code>{linkedUserId}</code>{" "}
                        <button style={{ marginLeft: 10 }} onClick={async () => copyText(linkedUserId)}>Copy User UUID</button>
                        <button style={{ marginLeft: 10 }} onClick={() => unlinkPlayer(p.id)}>Unlink</button>
                      </>
                    ) : (
                      <span style={{ opacity: 0.75 }}>Not linked</span>
                    )}
                  </div>

                  {p.note ? <div style={{ marginTop: 6, opacity: 0.85 }}>Note: {p.note}</div> : null}

                  <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                    <div style={{ border: "1px solid #222", borderRadius: 10, padding: 10, background: "rgba(255,255,255,0.02)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <div style={{ fontWeight: 800 }}>Dossier Snapshot</div>
                        <a href={`/dossier/${encodeURIComponent(p.id)}`}>Open Dossier Sheet</a>
                      </div>
                      <div style={{ marginTop: 8, display: "grid", gap: 6, fontSize: 12, opacity: 0.9 }}>
                        <div>Display Name: <b>{p.name || p.game_name || "—"}</b></div>
                        <div>Game Name: <b>{p.game_name || p.name || "—"}</b></div>
                        <div>Player ID: <code>{p.id}</code></div>
                        <div>Linked User: {linkedUserId ? <code>{linkedUserId}</code> : "Not linked"}</div>
                        <div>Alliances: {asn.length ? asn.map((a) => `${a.alliance_code} (${a.role})`).join(", ") : "None yet"}</div>
                        <div>Created: {p.created_at ? new Date(String(p.created_at)).toLocaleString() : "—"}</div>
                        <div>Updated: {p.updated_at ? new Date(String(p.updated_at)).toLocaleString() : "—"}</div>
                      </div>
                    </div>

                    <div style={{ border: "1px solid #222", borderRadius: 10, padding: 10, background: "rgba(255,255,255,0.02)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <div style={{ fontWeight: 800 }}>HQ Summary</div>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>{hqLoading ? "Loading HQ…" : `${hqs.length} HQ row(s)`}</div>
                      </div>

                      {primaryHq ? (
                        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
                          Primary HQ: <b>{s(primaryHq.hq_name || "HQ")}{primaryHq.hq_level ? ` • HQ ${s(primaryHq.hq_level)}` : ""}</b>
                        </div>
                      ) : null}

                      {hqs.length === 0 ? (
                        <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>No HQ rows found.</div>
                      ) : (
                        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                          {hqs.slice(0, 5).map((h, idx) => (
                            <div key={String(h.id || idx)} style={{ border: "1px solid #333", borderRadius: 8, padding: 8 }}>
                              <div style={{ fontWeight: 800 }}>
                                {h.is_primary ? "⭐ " : ""}
                                {s(h.hq_name || "HQ")}
                                {h.hq_level ? ` • HQ ${s(h.hq_level)}` : ""}
                              </div>
                              <div style={{ marginTop: 4, fontSize: 12, opacity: 0.82 }}>
                                Alliance: {s(h.alliance_code || "—")}
                                {h.troop_type ? ` • Type: ${s(h.troop_type)}` : ""}
                                {h.troop_tier ? ` • Tier: ${s(h.troop_tier)}` : ""}
                              </div>
                              <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
                                {h.coord_x != null -and h.coord_y != null ? `Coords: ${s(h.coord_x)}, ${s(h.coord_y)}` : "Coords: —"}
                                {h.march_size ? ` • March: ${s(h.march_size)}` : ""}
                                {h.rally_size ? ` • Rally: ${s(h.rally_size)}` : ""}
                                {h.troop_size ? ` • Troops: ${s(h.troop_size)}` : ""}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: 10, fontWeight: 800 }}>Alliance Assignments</div>

                  {asn.length === 0 ? (
                    <div style={{ opacity: 0.8, marginTop: 6 }}>None yet.</div>
                  ) : (
                    <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                      {asn.map((a) => (
                        <div key={a.id} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                          <div style={{ fontWeight: 800 }}>{a.alliance_code}</div>
                          <select value={a.role} onChange={(e) => updateAssignment(a.id, e.target.value as PlayerAlliance["role"])}>
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
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
                      {alliances.filter((a) => a.enabled).map((a) => (
                        <option key={a.code} value={a.code}>
                          {a.code} — {a.name}
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
'@

Set-Content -Path $path -Value $content -Encoding UTF8
Write-Host "Patched $path"
