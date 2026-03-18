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

export default function OwnerDossiersPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [membershipsByPlayer, setMembershipsByPlayer] = useState<Record<string, MembershipRow[]>>({});
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
      setLoading(false);
      setStatus("Players load failed: " + p.error.message);
      return;
    }

    const playerRows = (p.data || []) as PlayerRow[];
    setPlayers(playerRows);

    const ids = playerRows.map((x) => String(x.id || "")).filter(Boolean);
    if (!ids.length) {
      setMembershipsByPlayer({});
      setSelectedPlayerId("");
      setLoading(false);
      return;
    }

    const m = await supabase
      .from("player_alliances")
      .select("id, player_id, alliance_code, role")
      .in("player_id", ids);

    if (m.error) {
      setMembershipsByPlayer({});
      setLoading(false);
      setStatus((prev) => prev ? (prev + " | " + m.error.message) : ("Memberships load failed: " + m.error.message));
      return;
    }

    const grouped: Record<string, MembershipRow[]> = {};
    ((m.data || []) as MembershipRow[]).forEach((row) => {
      const pid = String(row.player_id || "");
      if (!pid) return;
      if (!grouped[pid]) grouped[pid] = [];
      grouped[pid].push(row);
    });

    Object.keys(grouped).forEach((k) => {
      grouped[k].sort((a, b) => norm(a.alliance_code).localeCompare(norm(b.alliance_code)));
    });

    setMembershipsByPlayer(grouped);

    const first = playerRows.find((row) => (grouped[String(row.id)] || []).length > 0) || playerRows[0] || null;
    setSelectedPlayerId((prev) => prev || String(first?.id || ""));
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
      const allianceCodes = memberships.map((m) => norm(m.alliance_code));
      const matchesAlliance = allianceFilter === "ALL" || allianceCodes.includes(allianceFilter);

      const haystack = [
        s(p.game_name),
        s(p.name),
        s(p.note),
        s(p.id),
        allianceCodes.join(" "),
      ].join(" ").toLowerCase();

      const matchesSearch = !q || haystack.includes(q);

      return matchesAlliance && matchesSearch;
    });
  }, [players, membershipsByPlayer, allianceFilter, search]);

  const selectedPlayer = useMemo(() => {
    return filteredPlayers.find((p) => String(p.id) === String(selectedPlayerId))
      || players.find((p) => String(p.id) === String(selectedPlayerId))
      || null;
  }, [filteredPlayers, players, selectedPlayerId]);

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
              View player dossier sheets by alliance without changing the player-facing pages. This page is meant for private owner review.
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
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 220px auto", gap: 10 }}>
          <input
            className="zombie-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search player, note, player id, alliance..."
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

      <div style={{ display: "grid", gridTemplateColumns: "380px minmax(0, 1fr)", gap: 12, alignItems: "start" }}>
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
            gap: 10,
          }}
        >
          {!selectedPlayer ? (
            <div style={{ opacity: 0.75 }}>Select a player to open the dossier preview.</div>
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

              <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, overflow: "hidden", minHeight: 620 }}>
                <iframe
                  title={`dossier-${String(selectedPlayer.id)}`}
                  src={`/dossier/${encodeURIComponent(String(selectedPlayer.id))}`}
                  style={{
                    width: "100%",
                    minHeight: 900,
                    border: "0",
                    background: "transparent",
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
