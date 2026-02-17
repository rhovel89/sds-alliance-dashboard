import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Membership = { alliance_code: string; role?: string | null };

const TROOP_TYPES = ["Shooter", "Rider", "Fighter"] as const;
const TROOP_TIERS = ["T5","T6","T7","T8","T9","T10","T11","T12","T13","T14"] as const;

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function safeInt(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  const s = String(v).trim();
  if (!s) return null;
  if (!/^-?\d+$/.test(s)) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function pickDate(row: any): Date | null {
  const cands = [
    row?.starts_at, row?.start_time, row?.start_at,
    row?.scheduled_for, row?.scheduled_at,
    row?.event_time, row?.date, row?.created_at
  ].filter(Boolean);

  for (const x of cands) {
    const d = new Date(x);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

export default function PlayerMeProfileAndHqsPanel() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [authUid, setAuthUid] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [selectedAlliance, setSelectedAlliance] = useState<string>("");

  const [profileId, setProfileId] = useState<string | null>(null);

  // Profile fields
  const [gameName, setGameName] = useState("");
  const [troopType, setTroopType] = useState<string>("Shooter");
  const [troopTier, setTroopTier] = useState<string>("T10");
  const [marchSizeNoHeroes, setMarchSizeNoHeroes] = useState<string>("");
  const [rallySize, setRallySize] = useState<string>("");

  // HQs
  const [hqs, setHqs] = useState<any[]>([]);
  const [hqDraft, setHqDraft] = useState<any>({
    hq_name: "",
    hq_level: "",
    coord_x: "",
    coord_y: "",
    troop_type: "",
    troop_tier: "",
    march_size_no_heroes: "",
    rally_size: ""
  });

  // Events preview
  const [events, setEvents] = useState<any[]>([]);

  const selectedRole = useMemo(() => {
    const m = memberships.find(x => upper(x.alliance_code) === upper(selectedAlliance));
    return String(m?.role ?? "").toLowerCase();
  }, [memberships, selectedAlliance]);

  const isManager = useMemo(() => ["owner","r4","r5"].includes(selectedRole), [selectedRole]);

  const loadBasics = async () => {
    setErr(null);
    setLoading(true);

    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id ?? null;
    setAuthUid(uid);

    if (!uid) {
      setErr("Not signed in.");
      setLoading(false);
      return;
    }

    // 1) Ensure we have playerId from players table (best effort)
    let pid: string | null = null;

    try {
      const { data: p, error: pErr } = await supabase
        .from("players")
        .select("id")
        .eq("auth_user_id", uid)
        .maybeSingle();

      if (!pErr && p?.id) pid = String(p.id);
    } catch {}

    // If missing, try to create a minimal players row (best effort, won’t break if schema requires more)
    if (!pid) {
      try {
        const { data: ins, error: insErr } = await supabase
          .from("players")
          .insert({ auth_user_id: uid } as any)
          .select("id")
          .maybeSingle();

        if (!insErr && ins?.id) pid = String(ins.id);
      } catch {}
    }

    setPlayerId(pid);

    // 2) Load memberships (player_alliances)
    if (pid) {
      const { data: pa, error: paErr } = await supabase
        .from("player_alliances")
        .select("alliance_code,role")
        .eq("player_id", pid)
        .order("alliance_code", { ascending: true });

      if (paErr) {
        setErr(paErr.message);
        setMemberships([]);
      } else {
        const ms = (pa ?? []).map((r: any) => ({ alliance_code: String(r.alliance_code), role: r.role ?? null }));
        setMemberships(ms);

        const saved = localStorage.getItem("me_selected_alliance") || "";
        const first = ms[0]?.alliance_code ? String(ms[0].alliance_code) : "";
        const pick = saved && ms.some(x => upper(x.alliance_code) === upper(saved)) ? saved : first;
        setSelectedAlliance(pick);
      }
    } else {
      setMemberships([]);
      setSelectedAlliance("");
      setErr("Could not find/create your player record. (players row missing).");
    }

    setLoading(false);
  };

  const loadProfile = async (allianceCode: string) => {
    if (!playerId || !allianceCode) return;
    setErr(null);

    const { data, error } = await supabase
      .from("player_alliance_profiles")
      .select("*")
      .eq("player_id", playerId)
      .eq("alliance_code", upper(allianceCode))
      .maybeSingle();

    if (error) {
      setErr(error.message);
      return;
    }

    if (!data) {
      setProfileId(null);
      setGameName("");
      setTroopType("Shooter");
      setTroopTier("T10");
      setMarchSizeNoHeroes("");
      setRallySize("");
      return;
    }

    setProfileId(String((data as any).id ?? ""));
    setGameName(String((data as any).game_name ?? ""));
    setTroopType(String((data as any).troop_type ?? "Shooter"));
    setTroopTier(String((data as any).troop_tier ?? "T10"));
    setMarchSizeNoHeroes(String((data as any).march_size_no_heroes ?? ""));
    setRallySize(String((data as any).rally_size ?? ""));
  };

  const saveProfile = async () => {
    if (!playerId || !selectedAlliance) return;
    setErr(null);

    const payload: any = {
      player_id: playerId,
      alliance_code: upper(selectedAlliance),
      game_name: gameName.trim() || null,
      troop_type: troopType || null,
      troop_tier: troopTier || null,
      march_size_no_heroes: safeInt(marchSizeNoHeroes),
      rally_size: safeInt(rallySize),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("player_alliance_profiles")
      .upsert(payload, { onConflict: "player_id,alliance_code" })
      .select("id")
      .maybeSingle();

    if (error) {
      setErr(error.message);
      return;
    }

    if (data?.id) setProfileId(String(data.id));
  };

  const loadHqs = async (allianceCode: string) => {
    if (!authUid || !allianceCode) return;
    setErr(null);

    const { data, error } = await supabase
      .from("player_hqs")
      .select("*")
      .eq("user_id", authUid)
      .eq("alliance_id", upper(allianceCode))
      .order("updated_at", { ascending: false });

    if (error) {
      setErr(error.message);
      setHqs([]);
      return;
    }
    setHqs((data ?? []) as any[]);
  };

  const addHq = async () => {
    if (!authUid || !selectedAlliance) return;
    setErr(null);

    const payload: any = {
      user_id: authUid,
      alliance_id: upper(selectedAlliance),
      profile_id: profileId || null,
      hq_name: String(hqDraft.hq_name ?? "").trim() || null,
      hq_level: safeInt(hqDraft.hq_level),
      coord_x: safeInt(hqDraft.coord_x),
      coord_y: safeInt(hqDraft.coord_y),
      troop_type: String(hqDraft.troop_type ?? "").trim() || null,
      troop_tier: String(hqDraft.troop_tier ?? "").trim() || null,
      march_size_no_heroes: safeInt(hqDraft.march_size_no_heroes),
      rally_size: safeInt(hqDraft.rally_size),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from("player_hqs").insert(payload);
    if (error) {
      setErr(error.message);
      return;
    }

    setHqDraft({
      hq_name: "",
      hq_level: "",
      coord_x: "",
      coord_y: "",
      troop_type: "",
      troop_tier: "",
      march_size_no_heroes: "",
      rally_size: ""
    });

    await loadHqs(selectedAlliance);
  };

  const saveHq = async (id: string, patch: any) => {
    setErr(null);
    const { error } = await supabase
      .from("player_hqs")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      setErr(error.message);
      return;
    }
    await loadHqs(selectedAlliance);
  };

  const deleteHq = async (id: string) => {
    if (!confirm("Delete this HQ?")) return;
    setErr(null);

    const { error } = await supabase.from("player_hqs").delete().eq("id", id);
    if (error) {
      setErr(error.message);
      return;
    }
    await loadHqs(selectedAlliance);
  };

  const loadEventsPreview = async (allianceCode: string) => {
    setErr(null);
    setEvents([]);
    if (!allianceCode) return;

    // Try alliance_code first, fallback to alliance_id if needed
    const tryA = await supabase
      .from("alliance_events")
      .select("*")
      .eq("alliance_code", upper(allianceCode))
      .limit(50);

    let rows: any[] = [];
    if (!tryA.error) {
      rows = (tryA.data ?? []) as any[];
    } else {
      const msg = String(tryA.error.message || "").toLowerCase();
      if (msg.includes("alliance_code")) {
        const tryB = await supabase
          .from("alliance_events")
          .select("*")
          .eq("alliance_id", upper(allianceCode))
          .limit(50);

        if (!tryB.error) rows = (tryB.data ?? []) as any[];
      }
    }

    const now = new Date();
    const upcoming = rows
      .map((r) => ({ r, d: pickDate(r) }))
      .filter((x) => x.d && x.d.getTime() >= now.getTime() - 60*60*1000)
      .sort((a, b) => (a.d!.getTime() - b.d!.getTime()))
      .slice(0, 6)
      .map((x) => x.r);

    setEvents(upcoming);
  };

  useEffect(() => {
    loadBasics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const code = upper(selectedAlliance);
    if (!code) return;

    localStorage.setItem("me_selected_alliance", code);
    loadProfile(code);
    loadHqs(code);
    loadEventsPreview(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAlliance, playerId, authUid]);

  if (loading) {
    return <div style={{ padding: 12, opacity: 0.85 }}>Loading your ME dashboard…</div>;
  }

  return (
    <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
      <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>🧟 Your ME Dashboard</div>
            <div style={{ opacity: 0.75, fontSize: 12 }}>Profile + HQs are saved per alliance.</div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ opacity: 0.8, fontSize: 12 }}>Alliance</span>
              <select
                value={selectedAlliance}
                onChange={(e) => setSelectedAlliance(e.target.value)}
                style={{ padding: "6px 8px", borderRadius: 10 }}
              >
                <option value="">(none)</option>
                {memberships.map((m) => (
                  <option key={m.alliance_code} value={m.alliance_code}>
                    {upper(m.alliance_code)}{m.role ? ` (${String(m.role)})` : ""}
                  </option>
                ))}
              </select>
            </label>

            {selectedAlliance ? (
              <>
                <a
                  href={`/dashboard/${encodeURIComponent(upper(selectedAlliance))}`}
                  style={{ textDecoration: "none", opacity: 0.9 }}
                >
                  Open Alliance Dashboard →
                </a>
              </>
            ) : null}
          </div>
        </div>

        {err ? (
          <div style={{ marginTop: 10, padding: 10, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 10 }}>
            <b>Error:</b> {err}
          </div>
        ) : null}
      </div>

      {/* Profile */}
      <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <b>🎮 Player Profile</b>
            <div style={{ opacity: 0.7, fontSize: 12 }}>Saved per alliance.</div>
          </div>
          <button onClick={saveProfile} disabled={!selectedAlliance} style={{ borderRadius: 10, padding: "8px 10px" }}>
            Save Profile
          </button>
        </div>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ opacity: 0.8, fontSize: 12 }}>Game Name</span>
            <input value={gameName} onChange={(e) => setGameName(e.target.value)} style={{ padding: 10, borderRadius: 10 }} />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ opacity: 0.8, fontSize: 12 }}>Troop Type</span>
            <select value={troopType} onChange={(e) => setTroopType(e.target.value)} style={{ padding: 10, borderRadius: 10 }}>
              {TROOP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ opacity: 0.8, fontSize: 12 }}>Troop Tier</span>
            <select value={troopTier} onChange={(e) => setTroopTier(e.target.value)} style={{ padding: 10, borderRadius: 10 }}>
              {TROOP_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ opacity: 0.8, fontSize: 12 }}>March Size (no heroes)</span>
            <input value={marchSizeNoHeroes} onChange={(e) => setMarchSizeNoHeroes(e.target.value)} inputMode="numeric" style={{ padding: 10, borderRadius: 10 }} />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ opacity: 0.8, fontSize: 12 }}>Rally Size</span>
            <input value={rallySize} onChange={(e) => setRallySize(e.target.value)} inputMode="numeric" style={{ padding: 10, borderRadius: 10 }} />
          </label>
        </div>
      </div>

      {/* HQs */}
      <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
          <div>
            <b>🏰 Your HQ(s)</b>
            <div style={{ opacity: 0.7, fontSize: 12 }}>Add as many HQs as you want for the selected alliance.</div>
          </div>
        </div>

        {/* Add HQ */}
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          <input placeholder="HQ Name" value={hqDraft.hq_name} onChange={(e) => setHqDraft((p: any) => ({ ...p, hq_name: e.target.value }))} style={{ padding: 10, borderRadius: 10 }} />
          <input placeholder="HQ Level" value={hqDraft.hq_level} onChange={(e) => setHqDraft((p: any) => ({ ...p, hq_level: e.target.value }))} inputMode="numeric" style={{ padding: 10, borderRadius: 10 }} />
          <input placeholder="X" value={hqDraft.coord_x} onChange={(e) => setHqDraft((p: any) => ({ ...p, coord_x: e.target.value }))} inputMode="numeric" style={{ padding: 10, borderRadius: 10 }} />
          <input placeholder="Y" value={hqDraft.coord_y} onChange={(e) => setHqDraft((p: any) => ({ ...p, coord_y: e.target.value }))} inputMode="numeric" style={{ padding: 10, borderRadius: 10 }} />

          <select value={hqDraft.troop_type} onChange={(e) => setHqDraft((p: any) => ({ ...p, troop_type: e.target.value }))} style={{ padding: 10, borderRadius: 10 }}>
            <option value="">Troop Type (optional)</option>
            {TROOP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <select value={hqDraft.troop_tier} onChange={(e) => setHqDraft((p: any) => ({ ...p, troop_tier: e.target.value }))} style={{ padding: 10, borderRadius: 10 }}>
            <option value="">Troop Tier (optional)</option>
            {TROOP_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <input placeholder="March Size (no heroes)" value={hqDraft.march_size_no_heroes} onChange={(e) => setHqDraft((p: any) => ({ ...p, march_size_no_heroes: e.target.value }))} inputMode="numeric" style={{ padding: 10, borderRadius: 10 }} />
          <input placeholder="Rally Size" value={hqDraft.rally_size} onChange={(e) => setHqDraft((p: any) => ({ ...p, rally_size: e.target.value }))} inputMode="numeric" style={{ padding: 10, borderRadius: 10 }} />

          <button onClick={addHq} disabled={!selectedAlliance || !String(hqDraft.hq_name || "").trim()} style={{ borderRadius: 10, padding: "10px 12px" }}>
            Add HQ
          </button>
        </div>

        {/* HQ cards */}
        {hqs.length === 0 ? (
          <div style={{ marginTop: 12, opacity: 0.75 }}>No HQs saved yet for this alliance.</div>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
            {hqs.map((hq) => {
              const id = String(hq.id);
              return (
                <div key={id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                    <div style={{ fontWeight: 900 }}>
                      {hq.hq_name || "HQ"}
                      {hq.hq_level ? <span style={{ opacity: 0.75, fontWeight: 600 }}> — Lv {hq.hq_level}</span> : null}
                    </div>
                    <button onClick={() => deleteHq(id)} style={{ borderRadius: 10, padding: "6px 10px" }}>
                      Delete
                    </button>
                  </div>

                  <div style={{ marginTop: 8, opacity: 0.85, fontSize: 13 }}>
                    {Number.isFinite(hq.coord_x) && Number.isFinite(hq.coord_y) ? (
                      <div>📍 {hq.coord_x},{hq.coord_y}</div>
                    ) : null}
                    {hq.troop_type ? <div>🪖 {hq.troop_type}</div> : null}
                    {hq.troop_tier ? <div>⭐ {hq.troop_tier}</div> : null}
                    {hq.march_size_no_heroes ? <div>🚶 March: {hq.march_size_no_heroes}</div> : null}
                    {hq.rally_size ? <div>📣 Rally: {hq.rally_size}</div> : null}
                  </div>

                  <details style={{ marginTop: 10 }}>
                    <summary style={{ cursor: "pointer" }}>Edit</summary>
                    <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                      <input defaultValue={hq.hq_name ?? ""} placeholder="HQ Name"
                        onBlur={(e) => saveHq(id, { hq_name: String(e.target.value).trim() || null })} style={{ padding: 10, borderRadius: 10 }} />
                      <input defaultValue={hq.hq_level ?? ""} placeholder="HQ Level" inputMode="numeric"
                        onBlur={(e) => saveHq(id, { hq_level: safeInt(e.target.value) })} style={{ padding: 10, borderRadius: 10 }} />
                      <input defaultValue={hq.coord_x ?? ""} placeholder="X" inputMode="numeric"
                        onBlur={(e) => saveHq(id, { coord_x: safeInt(e.target.value) })} style={{ padding: 10, borderRadius: 10 }} />
                      <input defaultValue={hq.coord_y ?? ""} placeholder="Y" inputMode="numeric"
                        onBlur={(e) => saveHq(id, { coord_y: safeInt(e.target.value) })} style={{ padding: 10, borderRadius: 10 }} />
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Events preview + links */}
      <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <b>🗓 Upcoming Alliance Events</b>
            <div style={{ opacity: 0.7, fontSize: 12 }}>Preview only. Full calendar is view-only unless Owner/R4/R5.</div>
          </div>
          {selectedAlliance ? (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <a href={`/dashboard/${encodeURIComponent(upper(selectedAlliance))}/calendar?view=1`} style={{ textDecoration: "none" }}>
                Open Calendar →
              </a>
              <a href={`/dashboard/${encodeURIComponent(upper(selectedAlliance))}/hq-map?view=1`} style={{ textDecoration: "none" }}>
                Open HQ Map →
              </a>
              {isManager ? <span style={{ opacity: 0.8, fontSize: 12 }}>You can edit these pages.</span> : null}
            </div>
          ) : null}
        </div>

        {!selectedAlliance ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>Pick an alliance above to see upcoming events.</div>
        ) : events.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>No upcoming events found.</div>
        ) : (
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {events.map((ev: any) => {
              const d = pickDate(ev);
              const title = String(ev?.title ?? ev?.name ?? ev?.label ?? "Event");
              return (
                <div key={String(ev?.id ?? title + String(d?.getTime() ?? ""))} style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,0.10)" }}>
                  <div style={{ fontWeight: 800 }}>{title}</div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>
                    {d ? d.toLocaleString() : "—"}
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