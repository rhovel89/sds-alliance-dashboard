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

type AllianceCodeRow = { alliance_code: string };

const ROLE_OPTIONS = ["member", "r4", "r5", "owner"] as const;

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test((v || "").trim());
}

export default function OwnerPlayerIntakePage() {
  const [status, setStatus] = useState<string>("");

  // new player form
  const [gameName, setGameName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [note, setNote] = useState("");
  const [assignAlliance, setAssignAlliance] = useState("");
  const [assignRole, setAssignRole] = useState<(typeof ROLE_OPTIONS)[number]>("member");

  // link auth form
  const [linkPlayerId, setLinkPlayerId] = useState("");
  const [linkAuthUid, setLinkAuthUid] = useState("");

  // data
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [alliances, setAlliances] = useState<string[]>([]);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return players;
    return players.filter((p) => {
      const a = (p.game_name || "").toLowerCase();
      const b = (p.name || "").toLowerCase();
      const c = (p.id || "").toLowerCase();
      return a.includes(s) || b.includes(s) || c.includes(s);
    });
  }, [players, q]);

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
    } else {
      setPlayers((p.data as any) ?? []);
    }

    // alliance codes (optional table; if missing, we just allow manual entry)
    const a = await supabase.from("alliance_code_map").select("alliance_code").order("alliance_code", { ascending: true });
    if (!a.error) {
      const codes = ((a.data as any) ?? []).map((r: AllianceCodeRow) => String(r.alliance_code || "").toUpperCase()).filter(Boolean);
      setAlliances(Array.from(new Set(codes)));
    }
  }

  useEffect(() => { void loadAll(); }, []);

  async function createPlayer() {
    setStatus("");
    const gn = gameName.trim();
    const dn = displayName.trim();
    if (!gn) return alert("Game Name is required.");
    if (!dn) return alert("Player Display Name is required.");

    // Create placeholder player (auth_user_id stays null until they sign in)
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
      setStatus("Create player: missing returned id (insert may still have worked). Refresh and search.");
      await loadAll();
      return;
    }

    // Optional: assign alliance membership
    const ac = String(assignAlliance || "").trim().toUpperCase();
    if (ac) {
      const mem = await supabase.from("player_alliances").insert({
        player_id: newId,
        alliance_code: ac,
        role: String(assignRole || "member").toLowerCase(),
      } as any);

      if (mem.error) {
        setStatus("Player created, but membership insert failed: " + mem.error.message);
      } else {
        setStatus("Player created + membership added ✅");
      }
    } else {
      setStatus("Player created ✅ (not assigned to an alliance yet)");
    }

    // reset form
    setGameName("");
    setDisplayName("");
    setNote("");
    setAssignAlliance("");
    setAssignRole("member");
    await loadAll();
  }

  async function linkAuth() {
    setStatus("");
    const pid = linkPlayerId.trim();
    const uid = linkAuthUid.trim();

    if (!isUuid(pid)) return alert("Player ID must be a UUID (paste the exact player id).");
    if (!isUuid(uid)) return alert("Auth User ID must be a UUID (paste auth.uid() / auth.users.id).");

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

  return (
    <div style={{ padding: 18, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🧪 Player Intake (Pre-Register)</h2>
        <a href="/owner" style={{ textDecoration: "none" }}>← Back to Owner</a>
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

            <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
              <div style={{ fontWeight: 800, opacity: 0.9 }}>Optional: assign alliance + role now</div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <select value={assignAlliance} onChange={(e) => setAssignAlliance(e.target.value)} style={{ minWidth: 160 }}>
                  <option value="">(no alliance)</option>
                  {alliances.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select value={assignRole} onChange={(e) => setAssignRole(e.target.value as any)} style={{ minWidth: 140 }}>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r.toUpperCase()}</option>
                  ))}
                </select>

                <span style={{ opacity: 0.75, fontSize: 12 }}>
                  If your alliance doesn’t show, you can still type it below:
                </span>
              </div>

              <input
                value={assignAlliance}
                onChange={(e) => setAssignAlliance(e.target.value)}
                placeholder="Alliance code (e.g., WOC) — optional"
              />
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
              <button onClick={createPlayer} style={{ padding: "10px 12px", borderRadius: 10 }}>
                Add Player
              </button>
              <button onClick={() => void loadAll()} style={{ padding: "10px 12px", borderRadius: 10 }}>
                Refresh
              </button>
            </div>

            <div style={{ opacity: 0.75, fontSize: 12 }}>
              This creates a placeholder record in <code>players</code> with <code>auth_user_id = null</code>.
              When they sign in later, link them using the panel on the right (or your existing /owner/players-link).
            </div>
          </div>
        </div>

        {/* Link auth */}
        <div style={{ border: "1px solid rgba(255,255,255,0.16)", borderRadius: 14, padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Link a signed-in auth user to an existing player</div>

          <div style={{ display: "grid", gap: 8 }}>
            <input
              value={linkPlayerId}
              onChange={(e) => setLinkPlayerId(e.target.value)}
              placeholder="Player ID (UUID)"
            />
            <input
              value={linkAuthUid}
              onChange={(e) => setLinkAuthUid(e.target.value)}
              placeholder="Auth User ID (UUID)"
            />

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={linkAuth} style={{ padding: "10px 12px", borderRadius: 10 }}>
                Link Auth
              </button>
              <span style={{ opacity: 0.75, fontSize: 12 }}>
                (Creates a row in <code>player_auth_links</code>)
              </span>
            </div>

            <div style={{ opacity: 0.75, fontSize: 12 }}>
              Tip: You can find the auth user id in Supabase → Authentication → Users,
              or by SQL: <code>select id,email from auth.users order by created_at desc limit 25</code>
            </div>
          </div>
        </div>
      </div>

      {/* Players list */}
      <div style={{ marginTop: 14, border: "1px solid rgba(255,255,255,0.16)", borderRadius: 14, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 900 }}>Players (latest)</div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search game name / display name / id…" />
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {filtered.slice(0, 120).map((p) => (
            <div key={p.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 900 }}>
                    {(p.game_name || "(no game name)")} — {(p.name || "(no name)")}
                  </div>
                  <div style={{ opacity: 0.75, fontSize: 12, marginTop: 2 }}>
                    id: <code>{p.id}</code>
                    {p.auth_user_id ? <> • auth_user_id: <code>{p.auth_user_id}</code></> : <> • auth: <b>not linked</b></>}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(p.id); setStatus("Copied player id ✅"); window.setTimeout(() => setStatus(""), 900); }}
                  >
                    Copy Player ID
                  </button>
                  {p.auth_user_id ? (
                    <button
                      onClick={() => { navigator.clipboard?.writeText(String(p.auth_user_id)); setStatus("Copied auth_user_id ✅"); window.setTimeout(() => setStatus(""), 900); }}
                    >
                      Copy Auth ID
                    </button>
                  ) : null}
                  <button
                    onClick={() => { setLinkPlayerId(p.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  >
                    Link this player…
                  </button>
                </div>
              </div>

              {p.note ? <div style={{ marginTop: 8, opacity: 0.9, whiteSpace: "pre-wrap" }}>{p.note}</div> : null}
            </div>
          ))}
          {filtered.length === 0 ? <div style={{ opacity: 0.8 }}>No players found.</div> : null}
        </div>
      </div>
    </div>
  );
}
