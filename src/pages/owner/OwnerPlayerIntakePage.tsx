import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type PlayerRow = {
  id: string;
  game_name: string | null;
  name: string | null;
  note: string | null;
  auth_user_id: string | null;
  created_at?: string | null;
};

type MembershipRow = {
  id?: string;
  player_id: string;
  alliance_code: string;
  role: string | null;
  role_key?: string | null;
  created_at?: string | null;
};

type AuthLinkRow = { player_id: string; user_id: string };

type AllianceOption = { code: string; name?: string | null; state?: string | null };

const ROLE_OPTIONS = ["member", "r4", "r5", "owner"] as const;

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test((v || "").trim());
}
function uc(v: any) { return String(v || "").trim().toUpperCase(); }
function lc(v: any) { return String(v || "").trim().toLowerCase(); }

export default function OwnerPlayerIntakePage() {
  const [status, setStatus] = useState<string>("");

  // new player form
  const [gameName, setGameName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [note, setNote] = useState("");

  // multi-membership draft for new player
  const [draftAlliance, setDraftAlliance] = useState("");
  const [draftRole, setDraftRole] = useState<(typeof ROLE_OPTIONS)[number]>("member");
  const [draftMemberships, setDraftMemberships] = useState<Array<{ alliance_code: string; role: (typeof ROLE_OPTIONS)[number] }>>([]);

  // link auth form
  const [linkPlayerId, setLinkPlayerId] = useState("");
  const [linkAuthUid, setLinkAuthUid] = useState("");

  // data
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [alliances, setAlliances] = useState<AllianceOption[]>([]);
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const [authLinks, setAuthLinks] = useState<AuthLinkRow[]>([]);
  const [q, setQ] = useState("");

  const membershipsByPlayer = useMemo(() => {
    const m: Record<string, MembershipRow[]> = {};
    for (const r of memberships) {
      const pid = String(r.player_id || "");
      if (!pid) continue;
      if (!m[pid]) m[pid] = [];
      m[pid].push(r);
    }
    for (const pid of Object.keys(m)) {
      m[pid] = m[pid].slice().sort((a, b) => (uc(a.alliance_code) > uc(b.alliance_code) ? 1 : -1));
    }
    return m;
  }, [memberships]);

  const authLinkCountByPlayer = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of authLinks) {
      const pid = String(l.player_id || "");
      if (!pid) continue;
      c[pid] = (c[pid] || 0) + 1;
    }
    return c;
  }, [authLinks]);

  const allianceLabel = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of alliances) {
      const code = uc(a.code);
      if (!code) continue;
      const nm = (a.name ? String(a.name) : "").trim();
      map[code] = nm ? `${code} — ${nm}` : code;
    }
    return map;
  }, [alliances]);

  const filteredPlayers = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return players;
    return players.filter((p) => {
      const a = (p.game_name || "").toLowerCase();
      const b = (p.name || "").toLowerCase();
      const c = (p.id || "").toLowerCase();
      return a.includes(s) || b.includes(s) || c.includes(s);
    });
  }, [players, q]);

  async function tryLoadAlliances(): Promise<AllianceOption[]> {
    // Best-effort: try tables in order. If a table doesn't exist, ignore and fall back.
    // 1) alliance_directory_items (common in directory setups)
    try {
      const r = await supabase
        .from("alliance_directory_items")
        .select("code,name,state,alliance_code,display_name")
        .order("code", { ascending: true })
        .limit(500);
      if (!r.error && Array.isArray(r.data) && r.data.length) {
        return r.data.map((x: any) => ({
          code: uc(x.code || x.alliance_code),
          name: (x.name ?? x.display_name ?? null),
          state: (x.state ?? null),
        })).filter((x: AllianceOption) => !!x.code);
      }
    } catch {}

    // 2) alliances
    try {
      const r = await supabase
        .from("alliances")
        .select("code,name,state,alliance_code,display_name")
        .order("code", { ascending: true })
        .limit(500);
      if (!r.error && Array.isArray(r.data) && r.data.length) {
        return r.data.map((x: any) => ({
          code: uc(x.code || x.alliance_code),
          name: (x.name ?? x.display_name ?? null),
          state: (x.state ?? null),
        })).filter((x: AllianceOption) => !!x.code);
      }
    } catch {}

    // 3) alliance_code_map (code only)
    try {
      const r = await supabase
        .from("alliance_code_map")
        .select("alliance_code")
        .order("alliance_code", { ascending: true })
        .limit(500);
      if (!r.error && Array.isArray(r.data) && r.data.length) {
        return r.data.map((x: any) => ({ code: uc(x.alliance_code), name: null, state: null })).filter((x: AllianceOption) => !!x.code);
      }
    } catch {}

    return [];
  }

  async function loadAll() {
    setStatus("");

    // players
    const p = await supabase
      .from("players")
      .select("id,game_name,name,note,auth_user_id,created_at")
      .order("created_at", { ascending: false })
      .limit(300);

    if (p.error) {
      setStatus("Load players failed: " + p.error.message);
      setPlayers([]);
      return;
    }

    const playerRows = ((p.data as any) ?? []) as PlayerRow[];
    setPlayers(playerRows);

    // alliances
    const a = await tryLoadAlliances();
    setAlliances(a);

    // memberships + auth links for loaded players
    const ids = playerRows.map((x) => x.id).filter(Boolean);
    if (!ids.length) { setMemberships([]); setAuthLinks([]); return; }

    try {
      const m = await supabase
        .from("player_alliances")
        .select("id,player_id,alliance_code,role,role_key,created_at")
        .in("player_id", ids)
        .limit(2000);
      if (!m.error) setMemberships(((m.data as any) ?? []) as MembershipRow[]);
      else setMemberships([]);
    } catch {
      setMemberships([]);
    }

    try {
      const l = await supabase
        .from("player_auth_links")
        .select("player_id,user_id")
        .in("player_id", ids)
        .limit(4000);
      if (!l.error) setAuthLinks(((l.data as any) ?? []) as AuthLinkRow[]);
      else setAuthLinks([]);
    } catch {
      setAuthLinks([]);
    }
  }

  useEffect(() => { void loadAll(); }, []);

  function addDraftMembership() {
    const ac = uc(draftAlliance);
    if (!ac) return;
    const role = draftRole || "member";

    setDraftMemberships((prev) => {
      const exists = prev.some((x) => uc(x.alliance_code) === ac);
      if (exists) return prev;
      return [...prev, { alliance_code: ac, role }];
    });
    setDraftAlliance("");
    setDraftRole("member");
  }

  function removeDraftMembership(ac: string) {
    setDraftMemberships((prev) => prev.filter((x) => uc(x.alliance_code) !== uc(ac)));
  }

  async function createPlayer() {
    setStatus("");
    const gn = gameName.trim();
    const dn = displayName.trim();
    if (!gn) return alert("Game Name is required.");
    if (!dn) return alert("Player Display Name is required.");

    const ins = await supabase
      .from("players")
      .insert({
        game_name: gn,
        name: dn,
        note: note.trim() || null,
        auth_user_id: null,
      } as any)
      .select("id")
      .maybeSingle();

    if (ins.error) {
      setStatus("Create player failed: " + ins.error.message);
      return;
    }

    const newId = (ins.data as any)?.id as string | undefined;
    if (!newId) {
      setStatus("Player created, but missing returned id. Refresh and search.");
      await loadAll();
      return;
    }

    // optional: assign multiple memberships
    const batch = draftMemberships.slice();
    if (batch.length) {
      const payload = batch.map((x) => ({
        player_id: newId,
        alliance_code: uc(x.alliance_code),
        role: lc(x.role),
        role_key: lc(x.role),
      }));

      const m = await supabase.from("player_alliances").insert(payload as any);

      if (m.error) setStatus("Player created ✅ but memberships insert failed: " + m.error.message);
      else setStatus("Player created + memberships added ✅");
    } else {
      setStatus("Player created ✅ (no alliance assigned yet)");
    }

    setGameName("");
    setDisplayName("");
    setNote("");
    setDraftAlliance("");
    setDraftRole("member");
    setDraftMemberships([]);
    await loadAll();
  }

  async function linkAuth() {
    setStatus("");
    const pid = linkPlayerId.trim();
    const uid = linkAuthUid.trim();

    if (!isUuid(pid)) return alert("Player ID must be a UUID.");
    if (!isUuid(uid)) return alert("Auth User ID must be a UUID.");

    const res = await supabase.from("player_auth_links").insert({
      player_id: pid,
      user_id: uid,
    } as any);

    if (res.error) {
      setStatus("Link failed: " + res.error.message);
      return;
    }

    setStatus("Linked ✅");
    setLinkPlayerId("");
    setLinkAuthUid("");
    await loadAll();
  }

  async function updateRole(playerId: string, allianceCode: string, newRole: string) {
    const role = lc(newRole);
    if (!ROLE_OPTIONS.includes(role as any)) return alert("Invalid role.");
    if (!confirm(`Change role for ${allianceCode} to ${role.toUpperCase()}?`)) return;

    setStatus("Saving…");
    const up = await supabase
      .from("player_alliances")
      .update({ role, role_key: role } as any)
      .eq("player_id", playerId)
      .eq("alliance_code", uc(allianceCode));

    if (up.error) {
      setStatus("Role update failed: " + up.error.message);
      return;
    }

    setStatus("Role updated ✅");
    window.setTimeout(() => setStatus(""), 1000);
    await loadAll();
  }

  async function addMembership(playerId: string, allianceCode: string, role: string) {
    const ac = uc(allianceCode);
    if (!ac) return alert("Alliance code required.");
    const r = lc(role);
    if (!ROLE_OPTIONS.includes(r as any)) return alert("Invalid role.");

    // avoid duplicates client-side
    const existing = (membershipsByPlayer[playerId] || []).some((m) => uc(m.alliance_code) === ac);
    if (existing) return alert("Player already has membership for " + ac);

    setStatus("Adding membership…");
    const ins = await supabase.from("player_alliances").insert({
      player_id: playerId,
      alliance_code: ac,
      role: r,
      role_key: r,
    } as any);

    if (ins.error) {
      setStatus("Add membership failed: " + ins.error.message);
      return;
    }

    setStatus("Membership added ✅");
    window.setTimeout(() => setStatus(""), 1000);
    await loadAll();
  }

  const [addMap, setAddMap] = useState<Record<string, { alliance: string; role: (typeof ROLE_OPTIONS)[number] }>>({});

  function setAddDraft(playerId: string, patch: Partial<{ alliance: string; role: (typeof ROLE_OPTIONS)[number] }>) {
    setAddMap((prev) => {
      const cur = prev[playerId] || { alliance: "", role: "member" as const };
      return { ...prev, [playerId]: { ...cur, ...patch } };
    });
  }

  return (
    <div style={{ padding: 18, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🧪 Player Intake (Pre-Register + Roster)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <a href="/owner" style={{ textDecoration: "none" }}>← Back to Owner</a>
          <button onClick={() => void loadAll()}>Refresh</button>
        </div>
      </div>

      {status ? (
        <div style={{ marginTop: 12, padding: 10, border: "1px solid rgba(255,255,255,0.18)", borderRadius: 12 }}>
          {status}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
        {/* Create player */}
        <div style={{ border: "1px solid rgba(255,255,255,0.16)", borderRadius: 14, padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Add player (even if they haven’t signed in yet)</div>

          <div style={{ display: "grid", gap: 8 }}>
            <input value={gameName} onChange={(e) => setGameName(e.target.value)} placeholder="Game Name (required)" />
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display Name (required)" />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" />

            <div style={{ marginTop: 10, borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 10 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Assign alliances now (multi-select)</div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <select value={draftAlliance} onChange={(e) => setDraftAlliance(e.target.value)} style={{ minWidth: 220 }}>
                  <option value="">Select alliance…</option>
                  {alliances.map((a) => {
                    const code = uc(a.code);
                    const label = allianceLabel[code] || code;
                    return (
                      <option key={code} value={code}>{label}</option>
                    );
                  })}
                </select>

                <select value={draftRole} onChange={(e) => setDraftRole(e.target.value as any)} style={{ minWidth: 140 }}>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r.toUpperCase()}</option>
                  ))}
                </select>

                <button type="button" onClick={addDraftMembership} disabled={!draftAlliance}>
                  Add to list
                </button>
              </div>

              {draftMemberships.length ? (
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {draftMemberships.map((m) => {
                    const ac = uc(m.alliance_code);
                    return (
                      <div key={ac} style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 10 }}>
                        <div>
                          <div style={{ fontWeight: 900 }}>{allianceLabel[ac] || ac}</div>
                          <div style={{ opacity: 0.75, fontSize: 12 }}>Role: {uc(m.role)}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <select
                            value={m.role}
                            onChange={(e) => {
                              const nr = e.target.value as any;
                              setDraftMemberships((prev) => prev.map((x) => (uc(x.alliance_code) === ac ? { ...x, role: nr } : x)));
                            }}
                          >
                            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                          </select>
                          <button onClick={() => removeDraftMembership(ac)}>Remove</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>
                  No alliances selected (you can assign later).
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
              <button onClick={createPlayer} style={{ padding: "10px 12px", borderRadius: 10 }}>
                Add Player
              </button>
            </div>

            <div style={{ opacity: 0.75, fontSize: 12 }}>
              Creates a placeholder row in <code>players</code> with <code>auth_user_id = null</code>.
              You can link later via the panel on the right (or /owner/players-link).
            </div>
          </div>
        </div>

        {/* Link auth */}
        <div style={{ border: "1px solid rgba(255,255,255,0.16)", borderRadius: 14, padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Link a signed-in auth user to an existing player</div>

          <div style={{ display: "grid", gap: 8 }}>
            <input value={linkPlayerId} onChange={(e) => setLinkPlayerId(e.target.value)} placeholder="Player ID (UUID)" />
            <input value={linkAuthUid} onChange={(e) => setLinkAuthUid(e.target.value)} placeholder="Auth User ID (UUID)" />

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={linkAuth} style={{ padding: "10px 12px", borderRadius: 10 }}>
                Link Auth
              </button>
              <span style={{ opacity: 0.75, fontSize: 12 }}>
                (Creates row in <code>player_auth_links</code>)
              </span>
            </div>

            <div style={{ opacity: 0.75, fontSize: 12 }}>
              Provider type (Google/Discord) is managed by Supabase Auth; this UI shows link status, not provider.
            </div>
          </div>
        </div>
      </div>

      {/* Players list */}
      <div style={{ marginTop: 14, border: "1px solid rgba(255,255,255,0.16)", borderRadius: 14, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 900 }}>Players + Roster</div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search game name / display name / id…" />
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {filteredPlayers.slice(0, 150).map((p) => {
            const pid = p.id;
            const ms = membershipsByPlayer[pid] || [];
            const linkCount = authLinkCountByPlayer[pid] || 0;
            const directLinked = !!p.auth_user_id;

            const addDraft = addMap[pid] || { alliance: "", role: "member" as const };

            return (
              <div key={pid} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>
                      {(p.game_name || "(no game name)")} — {(p.name || "(no name)")}
                    </div>
                    <div style={{ opacity: 0.75, fontSize: 12, marginTop: 2 }}>
                      id: <code>{pid}</code>
                      {" "}• auth_user_id: {directLinked ? <code>{String(p.auth_user_id)}</code> : <b>not linked</b>}
                      {" "}• auth_links: <b>{linkCount}</b>
                    </div>
                    {p.note ? <div style={{ marginTop: 8, opacity: 0.9, whiteSpace: "pre-wrap" }}>{p.note}</div> : null}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => { navigator.clipboard?.writeText(pid); setStatus("Copied player id ✅"); window.setTimeout(() => setStatus(""), 900); }}>
                      Copy Player ID
                    </button>
                    <button onClick={() => { setLinkPlayerId(pid); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                      Link this player…
                    </button>
                  </div>
                </div>

                {/* Membership editor */}
                <div style={{ marginTop: 10, borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 10 }}>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>Alliance memberships</div>

                  {ms.length ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {ms.map((m) => {
                        const ac = uc(m.alliance_code);
                        const role = lc(m.role || "member");
                        return (
                          <div key={`${pid}-${ac}`} style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 10 }}>
                            <div style={{ fontWeight: 900 }}>{allianceLabel[ac] || ac}</div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                              <select value={role} onChange={(e) => void updateRole(pid, ac, e.target.value)}>
                                {ROLE_OPTIONS.map((r) => (
                                  <option key={r} value={r}>{r.toUpperCase()}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ opacity: 0.75, fontSize: 12 }}>No memberships yet.</div>
                  )}

                  {/* Add membership */}
                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <select
                      value={addDraft.alliance}
                      onChange={(e) => setAddDraft(pid, { alliance: e.target.value })}
                      style={{ minWidth: 220 }}
                    >
                      <option value="">Add alliance…</option>
                      {alliances.map((a) => {
                        const code = uc(a.code);
                        const label = allianceLabel[code] || code;
                        return (
                          <option key={code} value={code}>{label}</option>
                        );
                      })}
                    </select>

                    <select
                      value={addDraft.role}
                      onChange={(e) => setAddDraft(pid, { role: e.target.value as any })}
                      style={{ minWidth: 140 }}
                    >
                      {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                    </select>

                    <button
                      onClick={() => void addMembership(pid, addDraft.alliance, addDraft.role)}
                      disabled={!addDraft.alliance}
                    >
                      Add Membership
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredPlayers.length === 0 ? <div style={{ opacity: 0.8 }}>No players found.</div> : null}
        </div>
      </div>
    </div>
  );
}
