import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

// ✅ Pick ONE of these depending on what your project uses:
import { supabase } from "../../lib/supabaseClient";
// import { supabase } from "../../lib/supabase";

type PlayerRow = {
  id: string;
  auth_user_id: string;
  created_at?: string | null;
};

type AllianceRow = {
  code: string;
  name?: string | null;
};

type MembershipRow = {
  alliance_code: string;
  role: string | null;
};

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

const ROLES = ["Member", "R4", "R5", "Owner"] as const;

export default function OwnerPlayerAssignmentsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [alliances, setAlliances] = useState<AllianceRow[]>([]);

  const [q, setQ] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");

  const [memberships, setMemberships] = useState<MembershipRow[]>([]);

  const [newAuthUid, setNewAuthUid] = useState("");
  const [addAllianceCode, setAddAllianceCode] = useState("");
  const [addRole, setAddRole] = useState<(typeof ROLES)[number]>("Member");

  const selectedPlayer = useMemo(
    () => players.find((p) => String(p.id) === String(selectedPlayerId)) ?? null,
    [players, selectedPlayerId]
  );

  const filteredPlayers = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return players;
    return players.filter((p) => {
      return (
        String(p.id).toLowerCase().includes(s) ||
        String(p.auth_user_id).toLowerCase().includes(s)
      );
    });
  }, [players, q]);

  const loadPlayersAlliances = async () => {
    setLoading(true);
    setErr(null);
    setHint(null);

    try {
      const pRes = await supabase
        .from("players")
        .select("id,auth_user_id,created_at")
        .order("created_at", { ascending: false })
        .limit(300);

      if (pRes.error) throw pRes.error;
      setPlayers((pRes.data ?? []) as any);

      const aRes = await supabase
        .from("alliances")
        .select("code,name")
        .order("code", { ascending: true })
        .limit(500);

      // If alliances table is locked down, still let page work
      if (!aRes.error) setAlliances((aRes.data ?? []) as any);

      const first = (pRes.data ?? [])[0]?.id;
      if (first && !selectedPlayerId) setSelectedPlayerId(String(first));
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const loadMemberships = async (playerId: string) => {
    setErr(null);
    setHint(null);
    setMemberships([]);

    if (!playerId) return;

    const mRes = await supabase
      .from("player_alliances")
      .select("alliance_code,role")
      .eq("player_id", playerId)
      .order("alliance_code", { ascending: true });

    if (mRes.error) {
      setErr(mRes.error.message);
      return;
    }

    setMemberships(
      (mRes.data ?? []).map((r: any) => ({
        alliance_code: upper(r.alliance_code),
        role: r.role ?? null,
      })) as any
    );
  };

  useEffect(() => {
    loadPlayersAlliances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedPlayerId) return;
    loadMemberships(selectedPlayerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayerId]);

  const createPlayerRow = async () => {
    const uid = String(newAuthUid ?? "").trim();
    if (!uid) return;

    setErr(null);
    setHint(null);

    const ins = await supabase
      .from("players")
      .insert({ auth_user_id: uid } as any)
      .select("id,auth_user_id,created_at")
      .maybeSingle();

    if (ins.error) {
      setErr(ins.error.message);
      return;
    }

    setHint("Player row created ✅");
    setNewAuthUid("");
    await loadPlayersAlliances();
    if (ins.data?.id) setSelectedPlayerId(String(ins.data.id));
  };

  const addOrUpdateMembership = async () => {
    if (!selectedPlayerId) return;
    const code = upper(addAllianceCode);
    if (!code) return;

    setErr(null);
    setHint(null);

    const payload: any = {
      player_id: selectedPlayerId,
      alliance_code: code,
      role: addRole === "Member" ? null : addRole,
    };

    // ✅ Use upsert (clean + safe). If your table doesn't have a unique constraint,
    // it will error — in that case tell me and I'll swap to insert+update fallback.
    const up = await supabase
      .from("player_alliances")
      .upsert(payload, { onConflict: "player_id,alliance_code" as any });

    if (up.error) {
      setErr(up.error.message);
      return;
    }

    setHint("Membership saved ✅");
    setAddAllianceCode("");
    setAddRole("Member");
    await loadMemberships(selectedPlayerId);
  };

  const removeMembership = async (code: string) => {
    if (!selectedPlayerId) return;
    if (!window.confirm(`Remove ${upper(code)} from this player?`)) return;

    setErr(null);
    setHint(null);

    const del = await supabase
      .from("player_alliances")
      .delete()
      .eq("player_id", selectedPlayerId)
      .eq("alliance_code", upper(code));

    if (del.error) {
      setErr(del.error.message);
      return;
    }

    setHint("Removed ✅");
    await loadMemberships(selectedPlayerId);
  };

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0 }}>🛠️ Owner: Player Assignments</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/owner" style={{ opacity: 0.85 }}>
            Owner Home
          </Link>
          <Link to="/owner/players" style={{ opacity: 0.85 }}>
            Players
          </Link>
          <Link to="/owner/state" style={{ opacity: 0.85 }}>
            State Manager
          </Link>
          <Link to="/owner/state-leaders" style={{ opacity: 0.85 }}>
            State Leaders
          </Link>
          <Link to="/me" style={{ opacity: 0.85 }}>
            ME
          </Link>
        </div>
      </div>

      {err ? (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid rgba(255,0,0,0.35)",
            borderRadius: 10,
          }}
        >
          <b>Error:</b> {err}
        </div>
      ) : null}

      {hint ? (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid rgba(0,255,0,0.20)",
            borderRadius: 10,
            opacity: 0.95,
          }}
        >
          {hint}
        </div>
      ) : null}

      {loading ? (
        <div style={{ padding: 16 }}>Loading…</div>
      ) : (
        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "380px 1fr",
            gap: 16,
          }}
        >
          {/* Left: players */}
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 900 }}>Players</div>
            <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
              Select a player row (players.auth_user_id). If a user has never
              used the app, create their player row using their Auth UID.
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by player id or auth uid…"
                style={{ padding: 10, borderRadius: 10 }}
              />

              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                style={{ padding: 10, borderRadius: 10 }}
              >
                {filteredPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {String(p.id).slice(0, 8)}… —{" "}
                    {String(p.auth_user_id).slice(0, 12)}…
                  </option>
                ))}
              </select>

              <div
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.10)",
                  paddingTop: 10,
                }}
              >
                <div style={{ fontWeight: 900 }}>Create player row</div>
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <input
                    value={newAuthUid}
                    onChange={(e) => setNewAuthUid(e.target.value)}
                    placeholder="Auth UID (uuid)…"
                    style={{ flex: 1, padding: 10, borderRadius: 10 }}
                  />
                  <button
                    onClick={createPlayerRow}
                    style={{ padding: "10px 12px", borderRadius: 10 }}
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: memberships */}
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: 900 }}>Memberships</div>
                <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
                  Assign this player to alliances. They will see them on{" "}
                  <b>/me</b> and can switch dashboards.
                </div>
              </div>
              {selectedPlayer ? (
                <div style={{ opacity: 0.8, fontSize: 12 }}>
                  player_id: <code>{selectedPlayer.id}</code>
                </div>
              ) : null}
            </div>

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gap: 10,
                gridTemplateColumns: "1fr 160px 140px",
              }}
            >
              <div style={{ display: "grid", gap: 6 }}>
                <span style={{ opacity: 0.8, fontSize: 12 }}>Alliance</span>
                {alliances.length > 0 ? (
                  <select
                    value={addAllianceCode}
                    onChange={(e) => setAddAllianceCode(e.target.value)}
                    style={{ padding: 10, borderRadius: 10 }}
                  >
                    <option value="">Select alliance…</option>
                    {alliances.map((a) => (
                      <option key={a.code} value={a.code}>
                        {upper(a.code)} — {a.name ?? ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={addAllianceCode}
                    onChange={(e) => setAddAllianceCode(e.target.value)}
                    placeholder="Alliance code (e.g. WOC)…"
                    style={{ padding: 10, borderRadius: 10 }}
                  />
                )}
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <span style={{ opacity: 0.8, fontSize: 12 }}>Role</span>
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as any)}
                  style={{ padding: 10, borderRadius: 10 }}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <span style={{ opacity: 0.8, fontSize: 12 }}>&nbsp;</span>
                <button
                  onClick={addOrUpdateMembership}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    fontWeight: 900,
                  }}
                >
                  Save
                </button>
              </div>
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              {memberships.length === 0 ? (
                <div style={{ opacity: 0.75 }}>No alliances assigned yet.</div>
              ) : (
                memberships.map((m) => (
                  <div
                    key={m.alliance_code}
                    style={{
                      border: "1px solid rgba(255,255,255,0.10)",
                      borderRadius: 10,
                      padding: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontWeight: 900 }}>
                        {upper(m.alliance_code)}{" "}
                        {m.role ? `(${String(m.role)})` : "(Member)"}
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Link
                          to={`/me?alliance=${encodeURIComponent(
                            upper(m.alliance_code)
                          )}`}
                        >
                          Open in /me
                        </Link>
                        <Link to={`/dashboard/${encodeURIComponent(upper(m.alliance_code))}`}>
                          Alliance
                        </Link>
                        <button
                          onClick={() => removeMembership(m.alliance_code)}
                          style={{ padding: "6px 10px", borderRadius: 10 }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
              State roles are managed from <b>Owner → State Manager</b> /{" "}
              <b>State Leaders</b>.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


