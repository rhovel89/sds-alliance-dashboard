import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type PlayerRow = {
  id: string;
  game_name?: string | null;
  name?: string | null;
  note?: string | null;
  created_at?: string | null;
};

type MembershipRow = {
  id: string;
  player_id: string;
  alliance_code: string;
  role?: string | null;
};

type PlayerAuthLinkRow = {
  player_id: string;
  user_id: string;
};

type PlayerHqRow = {
  id?: string | null;
  profile_id?: string | null;
  alliance_code?: string | null;
  alliance_id?: string | null;
  hq_name?: string | null;
  hq_level?: number | null;
  is_primary?: boolean | null;
  troop_type?: string | null;
  troop_tier?: string | null;
  troop_size?: number | null;
  march_size?: number | null;
  march_size_no_heroes?: number | null;
  rally_size?: number | null;
  coord_x?: number | null;
  coord_y?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function s(v: any) {
  return v === null || v === undefined ? "" : String(v);
}

function norm(v: any) {
  return s(v).trim().toUpperCase();
}

function fmt(v?: string | null) {
  if (!v) return "—";
  try { return new Date(String(v)).toLocaleString(); } catch { return String(v); }
}

function numText(v: any) {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

export default function OwnerDossiersPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [membershipsByPlayer, setMembershipsByPlayer] = useState<Record<string, MembershipRow[]>>({});
  const [linksByPlayer, setLinksByPlayer] = useState<Record<string, string>>({});
  const [hqsByPlayer, setHqsByPlayer] = useState<Record<string, PlayerHqRow[]>>({});
  const [search, setSearch] = useState("");
  const [allianceFilter, setAllianceFilter] = useState("ALL");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");

  async function load() {
    setLoading(true);
    setStatus("");

    const p = await supabase
      .from("players")
      .select("id, game_name, name, note, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (p.error) {
      setPlayers([]);
      setMembershipsByPlayer({});
      setLinksByPlayer({});
      setHqsByPlayer({});
      setLoading(false);
      setStatus("Players load failed: " + p.error.message);
      return;
    }

    const playerRows = (p.data || []) as PlayerRow[];
    setPlayers(playerRows);

    const ids = playerRows.map((x) => String(x.id || "")).filter(Boolean);
    if (!ids.length) {
      setMembershipsByPlayer({});
      setLinksByPlayer({});
      setHqsByPlayer({});
      setSelectedPlayerId("");
      setLoading(false);
      return;
    }

    const nextErrors: string[] = [];

    const m = await supabase
      .from("player_alliances")
      .select("id, player_id, alliance_code, role")
      .in("player_id", ids);

    const groupedMemberships: Record<string, MembershipRow[]> = {};
    if (m.error) {
      nextErrors.push("Memberships load failed: " + m.error.message);
    } else {
      ((m.data || []) as MembershipRow[]).forEach((row) => {
        const pid = String(row.player_id || "");
        if (!pid) return;
        if (!groupedMemberships[pid]) groupedMemberships[pid] = [];
        groupedMemberships[pid].push(row);
      });

      Object.keys(groupedMemberships).forEach((k) => {
        groupedMemberships[k].sort((a, b) => norm(a.alliance_code).localeCompare(norm(b.alliance_code)));
      });
    }
    setMembershipsByPlayer(groupedMemberships);

    const l = await supabase
      .from("player_auth_links")
      .select("player_id, user_id")
      .in("player_id", ids);

    const groupedLinks: Record<string, string> = {};
    if (l.error) {
      nextErrors.push("Auth links load failed: " + l.error.message);
    } else {
      ((l.data || []) as PlayerAuthLinkRow[]).forEach((row) => {
        const pid = String(row.player_id || "");
        const uid = String(row.user_id || "");
        if (pid && uid) groupedLinks[pid] = uid;
      });
    }
    setLinksByPlayer(groupedLinks);

    const groupedHqs: Record<string, PlayerHqRow[]> = {};
    const sourceAPlayers = new Set<string>();

    const hqA = await supabase
      .from("player_alliance_hqs")
      .select("id, profile_id, alliance_code, hq_name, hq_level, is_primary, troop_type, troop_tier, troop_size, march_size, rally_size, coord_x, coord_y, created_at, updated_at")
      .in("profile_id", ids);

    if (!hqA.error) {
      ((hqA.data || []) as PlayerHqRow[]).forEach((row) => {
        const pid = String(row.profile_id || "");
        if (!pid) return;
        sourceAPlayers.add(pid);
        if (!groupedHqs[pid]) groupedHqs[pid] = [];
        groupedHqs[pid].push(row);
      });
    } else {
      nextErrors.push("HQ primary source load failed: " + hqA.error.message);
    }

    const hqB = await supabase
      .from("player_hqs")
      .select("id, profile_id, alliance_code, alliance_id, hq_name, hq_level, troop_type, troop_tier, troop_size, march_size_no_heroes, rally_size, coord_x, coord_y, created_at, updated_at")
      .in("profile_id", ids);

    if (!hqB.error) {
      ((hqB.data || []) as PlayerHqRow[]).forEach((row) => {
        const pid = String(row.profile_id || "");
        if (!pid) return;
        if (sourceAPlayers.has(pid)) return;
        if (!groupedHqs[pid]) groupedHqs[pid] = [];
        groupedHqs[pid].push(row);
      });
    } else {
      nextErrors.push("HQ fallback source load failed: " + hqB.error.message);
    }

    Object.keys(groupedHqs).forEach((k) => {
      groupedHqs[k].sort((a, b) => {
        const aPrimary = a.is_primary === true ? 0 : 1;
        const bPrimary = b.is_primary === true ? 0 : 1;
        if (aPrimary !== bPrimary) return aPrimary - bPrimary;

        const aLevel = Number(a.hq_level || 0);
        const bLevel = Number(b.hq_level || 0);
        if (aLevel !== bLevel) return bLevel - aLevel;

        return s(a.hq_name).localeCompare(s(b.hq_name));
      });
    });

    setHqsByPlayer(groupedHqs);

    const first =
      playerRows.find((row) => (groupedMemberships[String(row.id)] || []).length > 0) ||
      playerRows[0] ||
      null;

    setSelectedPlayerId((prev) => prev || String(first?.id || ""));
    setStatus(nextErrors.join(" | "));
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const allianceOptions = useMemo(() => {
    const vals = new Set<string>();
    Object.values(membershipsByPlayer).forEach((rows) => {
      rows.forEach((r) => {
        const code = norm(r.alliance_code);
        if (code) vals.add(code);
      });
    });
    return ["ALL", ...Array.from(vals).sort((a, b) => a.localeCompare(b))];
  }, [membershipsByPlayer]);

  const filteredPlayers = useMemo(() => {
    const q = s(search).trim().toLowerCase();

    return players.filter((p) => {
      const memberships = membershipsByPlayer[String(p.id)] || [];
      const hqs = hqsByPlayer[String(p.id)] || [];
      const allianceCodes = memberships.map((m) => norm(m.alliance_code));
      const matchesAlliance = allianceFilter === "ALL" || allianceCodes.includes(allianceFilter);

      const haystack = [
        s(p.game_name),
        s(p.name),
        s(p.note),
        s(p.id),
        s(linksByPlayer[String(p.id)] || ""),
        allianceCodes.join(" "),
        memberships.map((m) => `${s(m.alliance_code)} ${s(m.role)}`).join(" "),
        hqs.map((h) => [
          s(h.hq_name),
          s(h.hq_level),
          s(h.troop_type),
          s(h.troop_tier),
          s(h.coord_x),
          s(h.coord_y),
          s(h.alliance_code || h.alliance_id),
        ].join(" ")).join(" "),
      ].join(" ").toLowerCase();

      const matchesSearch = !q || haystack.includes(q);

      return matchesAlliance && matchesSearch;
    });
  }, [players, membershipsByPlayer, hqsByPlayer, linksByPlayer, allianceFilter, search]);

  const selectedPlayer = useMemo(() => {
    return filteredPlayers.find((p) => String(p.id) === String(selectedPlayerId))
      || players.find((p) => String(p.id) === String(selectedPlayerId))
      || null;
  }, [filteredPlayers, players, selectedPlayerId]);

  const selectedMemberships = useMemo(() => {
    if (!selectedPlayer) return [];
    return membershipsByPlayer[String(selectedPlayer.id)] || [];
  }, [membershipsByPlayer, selectedPlayer]);

  const selectedHqs = useMemo(() => {
    if (!selectedPlayer) return [];
    return hqsByPlayer[String(selectedPlayer.id)] || [];
  }, [hqsByPlayer, selectedPlayer]);

  const primaryHq = useMemo(() => {
    return selectedHqs.find((x) => x.is_primary === true) || selectedHqs[0] || null;
  }, [selectedHqs]);

  useEffect(() => {
    if (!selectedPlayer && filteredPlayers.length) {
      setSelectedPlayerId(String(filteredPlayers[0].id || ""));
    }
  }, [filteredPlayers, selectedPlayer]);

  return (
    <div style={{ width: "100%", maxWidth: 1600, margin: "0 auto", display: "grid", gap: 12 }}>
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
              <div style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", fontSize: 12, fontWeight: 800 }}>OWNER ONLY</div>
              <div style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", fontSize: 12, fontWeight: 800 }}>DOSSIERS</div>
              <div style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", fontSize: 12, fontWeight: 800 }}>ALLIANCE FILTER</div>
            </div>

            <div style={{ fontSize: 32, fontWeight: 950, lineHeight: 1.05 }}>
              Owner Player Dossiers
            </div>

            <div style={{ opacity: 0.84, marginTop: 10, lineHeight: 1.7, maxWidth: 960 }}>
              Private owner view of player identity, alliance memberships, HQ details, troop details, and a quick jump into the full dossier page.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a className="zombie-btn" href="/owner" style={{ padding: "10px 12px", textDecoration: "none" }}>Back to Owner</a>
            <a className="zombie-btn" href="/owner/players" style={{ padding: "10px 12px", textDecoration: "none" }}>Players</a>
            <button className="zombie-btn" type="button" style={{ padding: "10px 12px" }} onClick={() => void load()}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {status ? (
        <div
          style={{
            border: "1px solid rgba(255,120,120,0.30)",
            background: "rgba(255,120,120,0.08)",
            borderRadius: 12,
            padding: 12,
          }}
        >
          {status}
        </div>
      ) : null}

      <div
        className="zombie-card"
        style={{
          padding: 14,
          background: "rgba(0,0,0,0.20)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <input
            className="zombie-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search player, note, player id, alliance, HQ, troops..."
            style={{ padding: "10px 12px" }}
          />

          <select
            className="zombie-input"
            value={allianceFilter}
            onChange={(e) => setAllianceFilter(e.target.value)}
            style={{ padding: "10px 12px" }}
          >
            {allianceOptions.map((x) => (
              <option key={x} value={x}>{x === "ALL" ? "All Alliances" : x}</option>
            ))}
          </select>

          <button
            className="zombie-btn"
            type="button"
            style={{ padding: "10px 12px" }}
            onClick={() => {
              setSearch("");
              setAllianceFilter("ALL");
            }}
          >
            Reset
          </button>
        </div>

        <div style={{ opacity: 0.74, fontSize: 12, marginTop: 8 }}>
          Showing {filteredPlayers.length} of {players.length} players
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12, alignItems: "start" }}>
        <div
          className="zombie-card"
          style={{
            padding: 12,
            display: "grid",
            gap: 10,
            maxHeight: "75vh",
            overflow: "auto",
          }}
        >
          {loading ? <div style={{ opacity: 0.75 }}>Loading…</div> : null}

          {!loading && filteredPlayers.length === 0 ? (
            <div style={{ opacity: 0.75 }}>No matching players.</div>
          ) : null}

          {filteredPlayers.map((p) => {
            const rows = membershipsByPlayer[String(p.id)] || [];
            const active = String(selectedPlayerId) === String(p.id);
            const title = s(p.game_name || p.name || "Unnamed Player");
            const subtitle = s(p.name && p.name !== p.game_name ? p.name : "");

            return (
              <button
                key={String(p.id)}
                type="button"
                onClick={() => setSelectedPlayerId(String(p.id))}
                style={{
                  textAlign: "left",
                  borderRadius: 14,
                  padding: 12,
                  border: active ? "1px solid rgba(120,180,255,0.40)" : "1px solid rgba(255,255,255,0.10)",
                  background: active ? "rgba(120,180,255,0.10)" : "rgba(255,255,255,0.03)",
                  color: "inherit",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
                {subtitle ? <div style={{ opacity: 0.74, marginTop: 4 }}>{subtitle}</div> : null}

                <div style={{ opacity: 0.70, fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
                  Created: {fmt(p.created_at)}<br />
                  Alliances: {rows.length ? rows.map((x) => `${norm(x.alliance_code)}${x.role ? ` (${x.role})` : ""}`).join(", ") : "—"}
                </div>
              </button>
            );
          })}
        </div>

        <div
          className="zombie-card"
          style={{
            padding: 12,
            minHeight: 700,
            display: "grid",
            gap: 12,
          }}
        >
          {!selectedPlayer ? (
            <div style={{ opacity: 0.75 }}>Select a player to view the dossier summary.</div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 950, fontSize: 18 }}>
                    {s(selectedPlayer.game_name || selectedPlayer.name || "Player")}
                  </div>
                  <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4 }}>
                    player_id: <code>{String(selectedPlayer.id)}</code>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <a
                    className="zombie-btn"
                    href={`/dossier/${encodeURIComponent(String(selectedPlayer.id))}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ padding: "10px 12px", textDecoration: "none" }}
                  >
                    Open Full Dossier
                  </a>
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
                  <div style={{ fontWeight: 950, fontSize: 16 }}>Identity</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 12 }}>
                    <div>
                      <div style={{ opacity: 0.72, fontSize: 12 }}>Display Name</div>
                      <div style={{ fontWeight: 900, marginTop: 4 }}>{s(selectedPlayer.name || "—")}</div>
                    </div>
                    <div>
                      <div style={{ opacity: 0.72, fontSize: 12 }}>Game Name</div>
                      <div style={{ fontWeight: 900, marginTop: 4 }}>{s(selectedPlayer.game_name || selectedPlayer.name || "—")}</div>
                    </div>
                    <div>
                      <div style={{ opacity: 0.72, fontSize: 12 }}>Linked User</div>
                      <div style={{ fontWeight: 900, marginTop: 4 }}>
                        {linksByPlayer[String(selectedPlayer.id)] ? <code>{linksByPlayer[String(selectedPlayer.id)]}</code> : "Not linked"}
                      </div>
                    </div>
                    <div>
                      <div style={{ opacity: 0.72, fontSize: 12 }}>Created</div>
                      <div style={{ fontWeight: 900, marginTop: 4 }}>{fmt(selectedPlayer.created_at)}</div>
                    </div>
                  </div>

                  {s(selectedPlayer.note) ? (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ opacity: 0.72, fontSize: 12 }}>Note</div>
                      <div style={{ marginTop: 4 }}>{s(selectedPlayer.note)}</div>
                    </div>
                  ) : null}
                </div>

                <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
                  <div style={{ fontWeight: 950, fontSize: 16 }}>Alliance Memberships</div>
                  <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>Private owner view of player alliance assignments.</div>

                  <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                    {selectedMemberships.length ? selectedMemberships.map((m) => (
                      <div
                        key={String(m.id)}
                        style={{
                          border: "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(0,0,0,0.18)",
                          borderRadius: 12,
                          padding: 10,
                        }}
                      >
                        <div style={{ fontWeight: 900 }}>
                          {norm(m.alliance_code)}
                          <span style={{ opacity: 0.72, fontWeight: 700 }}> • role: {s(m.role || "member")}</span>
                        </div>
                      </div>
                    )) : (
                      <div style={{ opacity: 0.75 }}>No alliance memberships found.</div>
                    )}
                  </div>
                </div>

                <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
                  <div style={{ fontWeight: 950, fontSize: 16 }}>HQ Information</div>
                  <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>HQ, troop, march, rally, and coordinates summary.</div>

                  {primaryHq ? (
                    <div style={{ marginTop: 12, padding: 10, borderRadius: 12, border: "1px solid rgba(120,255,120,0.20)", background: "rgba(120,255,120,0.06)" }}>
                      <div style={{ fontWeight: 900 }}>
                        Primary HQ: {s(primaryHq.hq_name || "HQ")}
                        {primaryHq.hq_level ? ` • HQ ${s(primaryHq.hq_level)}` : ""}
                      </div>
                      <div style={{ opacity: 0.76, fontSize: 12, marginTop: 4 }}>
                        Alliance: {s(primaryHq.alliance_code || primaryHq.alliance_id || "—")}
                      </div>
                    </div>
                  ) : null}

                  <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                    {selectedHqs.length ? selectedHqs.map((h, i) => (
                      <div
                        key={String(h.id || i)}
                        style={{
                          border: "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(0,0,0,0.18)",
                          borderRadius: 12,
                          padding: 10,
                        }}
                      >
                        <div style={{ fontWeight: 900 }}>
                          {h.is_primary === true ? "⭐ " : ""}
                          {s(h.hq_name || "HQ")}
                          {h.hq_level ? ` • HQ ${s(h.hq_level)}` : ""}
                        </div>

                        <div style={{ opacity: 0.78, fontSize: 12, marginTop: 6, lineHeight: 1.6 }}>
                          Alliance: <b>{s(h.alliance_code || h.alliance_id || "—")}</b><br />
                          Troop Type: <b>{s(h.troop_type || "—")}</b> • Troop Tier: <b>{s(h.troop_tier || "—")}</b><br />
                          Troop Size: <b>{numText(h.troop_size)}</b> • March Size: <b>{numText(h.march_size ?? h.march_size_no_heroes)}</b> • Rally Size: <b>{numText(h.rally_size)}</b><br />
                          Coords: <b>{h.coord_x != null && h.coord_y != null ? `${s(h.coord_x)}, ${s(h.coord_y)}` : "—"}</b><br />
                          Updated: <b>{fmt(h.updated_at || h.created_at)}</b>
                        </div>
                      </div>
                    )) : (
                      <div style={{ opacity: 0.75 }}>No HQ rows found for this player.</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

