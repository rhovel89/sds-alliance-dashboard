import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Props = {
  allianceCode: string;
  userId: string;   // auth.uid()
  playerId: string; // players.id
  role?: string | null;
};

type ProfileRow = {
  id: string;
  player_id: string;
  alliance_code: string;
  game_name: string | null;
  troop_type: string | null;
  troop_tier: string | null;
  march_size_no_heroes: number | null;
  rally_size: number | null;
};

type HqRow = {
  id?: string;
  user_id: string;
  alliance_id: string;  // store alliance CODE here (text)
  profile_id?: string | null;

  hq_name: string | null;
  hq_level: number | null;
  coord_x: number | null;
  coord_y: number | null;

  troop_type: string | null;
  troop_tier: string | null;
  march_size_no_heroes: number | null;
  rally_size: number | null;

  created_at?: string | null;
  updated_at?: string | null;

  _localKey?: string; // local only
};

const TROOP_TYPES = ["Shooter", "Rider", "Fighter"] as const;
const TROOP_TIERS = ["T5","T6","T7","T8","T9","T10","T11","T12","T13","T14"] as const;

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function toInt(v: any): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function shallowEqual(a: any, b: any) {
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
}

function uuid(): string {
  const c: any = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function PlayerAllianceProfilePanel({ allianceCode, userId, playerId }: Props) {
  const code = useMemo(() => upper(allianceCode), [allianceCode]);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingHqs, setSavingHqs] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const [allianceName, setAllianceName] = useState<string>("");

  const [profileId, setProfileId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Omit<ProfileRow, "id" | "player_id" | "alliance_code">>({
    game_name: null,
    troop_type: null,
    troop_tier: null,
    march_size_no_heroes: null,
    rally_size: null,
  });

  const [hqs, setHqs] = useState<HqRow[]>([]);

  const bootedRef = useRef(false);
  const lastProfileSavedRef = useRef<any>(null);
  const profileSaveTimer = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr(null);
      setHint(null);

      try {
        if (!userId || !playerId || !code) {
          setLoading(false);
          return;
        }

        // best-effort alliance name
        try {
          const a = await supabase.from("alliances").select("name").eq("code", code).maybeSingle();
          if (!cancelled && !a.error) setAllianceName(String(a.data?.name ?? ""));
        } catch {}

        // load profile
        const pRes = await supabase
          .from("player_alliance_profiles")
          .select("id,player_id,alliance_code,game_name,troop_type,troop_tier,march_size_no_heroes,rally_size")
          .eq("player_id", playerId)
          .eq("alliance_code", code)
          .maybeSingle();

        if (pRes.error) throw pRes.error;

        let pid: string | null = pRes.data?.id ? String(pRes.data.id) : null;

        // create if missing
        if (!pid) {
          const ins = await supabase
            .from("player_alliance_profiles")
            .upsert(
              {
                player_id: playerId,
                alliance_code: code,
                game_name: null,
                troop_type: null,
                troop_tier: null,
                march_size_no_heroes: null,
                rally_size: null,
              } as any,
              { onConflict: "player_id,alliance_code" as any }
            )
            .select("id,game_name,troop_type,troop_tier,march_size_no_heroes,rally_size")
            .maybeSingle();

          if (ins.error) throw ins.error;
          pid = ins.data?.id ? String(ins.data.id) : null;
          if (!pid) throw new Error("Could not create player profile row.");
        }

        if (cancelled) return;

        setProfileId(pid);

        let nextProfile = {
          game_name: (pRes.data?.game_name ?? null) as any,
          troop_type: (pRes.data?.troop_type ?? null) as any,
          troop_tier: (pRes.data?.troop_tier ?? null) as any,
          march_size_no_heroes: (pRes.data?.march_size_no_heroes ?? null) as any,
          rally_size: (pRes.data?.rally_size ?? null) as any,
        };

        if (!pRes.data) {
          const p2 = await supabase
            .from("player_alliance_profiles")
            .select("game_name,troop_type,troop_tier,march_size_no_heroes,rally_size")
            .eq("player_id", playerId)
            .eq("alliance_code", code)
            .maybeSingle();
          if (!p2.error && p2.data) {
            nextProfile = {
              game_name: p2.data.game_name ?? null,
              troop_type: p2.data.troop_type ?? null,
              troop_tier: p2.data.troop_tier ?? null,
              march_size_no_heroes: (p2.data.march_size_no_heroes ?? null) as any,
              rally_size: (p2.data.rally_size ?? null) as any,
            };
          }
        }

        setProfile(nextProfile);
        lastProfileSavedRef.current = nextProfile;

        // load HQs
        const hRes = await supabase
          .from("player_hqs")
          .select("id,user_id,alliance_id,profile_id,hq_name,hq_level,coord_x,coord_y,troop_type,troop_tier,march_size_no_heroes,rally_size,created_at,updated_at")
          .eq("user_id", userId)
          .eq("alliance_id", code)
          .order("created_at", { ascending: true });

        if (hRes.error) throw hRes.error;

        const rows = (hRes.data ?? []).map((r: any) => ({
          ...r,
          _localKey: String(r.id ?? uuid()),
        })) as HqRow[];

        setHqs(rows);

        bootedRef.current = true;
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [code, userId, playerId]);

  // Auto-save profile (debounced)
  useEffect(() => {
    if (!bootedRef.current) return;
    if (!profileId) return;

    if (shallowEqual(profile, lastProfileSavedRef.current)) return;

    if (profileSaveTimer.current) clearTimeout(profileSaveTimer.current);

    profileSaveTimer.current = setTimeout(async () => {
      setSavingProfile(true);
      setErr(null);
      setHint(null);

      try {
        const payload: any = {
          id: profileId,
          player_id: playerId,
          alliance_code: code,
          game_name: profile.game_name ?? null,
          troop_type: profile.troop_type ?? null,
          troop_tier: profile.troop_tier ?? null,
          march_size_no_heroes: profile.march_size_no_heroes ?? null,
          rally_size: profile.rally_size ?? null,
          updated_at: new Date().toISOString(),
        };

        const up = await supabase
          .from("player_alliance_profiles")
          .upsert(payload, { onConflict: "player_id,alliance_code" as any })
          .select("game_name,troop_type,troop_tier,march_size_no_heroes,rally_size")
          .maybeSingle();

        if (up.error) throw up.error;

        lastProfileSavedRef.current = {
          game_name: up.data?.game_name ?? null,
          troop_type: up.data?.troop_type ?? null,
          troop_tier: up.data?.troop_tier ?? null,
          march_size_no_heroes: (up.data?.march_size_no_heroes ?? null) as any,
          rally_size: (up.data?.rally_size ?? null) as any,
        };

        setHint("Saved ✅");
        setTimeout(() => setHint(null), 1200);
      } catch (e: any) {
        setErr(e?.message ?? String(e));
      } finally {
        setSavingProfile(false);
      }
    }, 700);

    return () => {
      if (profileSaveTimer.current) clearTimeout(profileSaveTimer.current);
    };
  }, [profile, profileId, playerId, code]);

  const addHq = () => {
    const base: HqRow = {
      user_id: userId,
      alliance_id: code,
      profile_id: profileId,

      hq_name: null,
      hq_level: null,
      coord_x: null,
      coord_y: null,

      troop_type: profile.troop_type ?? null,
      troop_tier: profile.troop_tier ?? null,
      march_size_no_heroes: profile.march_size_no_heroes ?? null,
      rally_size: profile.rally_size ?? null,

      _localKey: uuid(),
    };
    setHqs((prev) => [...prev, base]);
    setHint("HQ added ✍️");
    setTimeout(() => setHint(null), 1200);
  };

  const updateHq = (key: string, patch: Partial<HqRow>) => {
    setHqs((prev) => prev.map((h) => (String(h._localKey) === String(key) ? { ...h, ...patch } : h)));
  };

  const deleteHq = async (hq: HqRow) => {
    if (!window.confirm("Delete this HQ?")) return;

    if (!hq.id) {
      setHqs((prev) => prev.filter((x) => x._localKey !== hq._localKey));
      return;
    }

    setSavingHqs(true);
    setErr(null);
    setHint(null);

    try {
      const del = await supabase.from("player_hqs").delete().eq("id", hq.id);
      if (del.error) throw del.error;

      setHqs((prev) => prev.filter((x) => x.id !== hq.id));
      setHint("HQ deleted ✅");
      setTimeout(() => setHint(null), 1200);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setSavingHqs(false);
    }
  };

  const saveAllHqs = async () => {
    if (!profileId) return;

    setSavingHqs(true);
    setErr(null);
    setHint(null);

    try {
      for (const h of hqs) {
        const payload: any = {
          id: h.id ?? undefined,
          user_id: userId,
          alliance_id: code,
          profile_id: profileId,

          hq_name: h.hq_name ?? null,
          hq_level: h.hq_level ?? null,
          coord_x: h.coord_x ?? null,
          coord_y: h.coord_y ?? null,

          troop_type: h.troop_type ?? null,
          troop_tier: h.troop_tier ?? null,
          march_size_no_heroes: h.march_size_no_heroes ?? null,
          rally_size: h.rally_size ?? null,

          updated_at: new Date().toISOString(),
        };

        if (!h.id) {
          const ins = await supabase.from("player_hqs").insert(payload).select("id,created_at,updated_at").maybeSingle();
          if (ins.error) throw ins.error;

          const newId = ins.data?.id ? String(ins.data.id) : null;
          if (newId) {
            updateHq(String(h._localKey), { id: newId, created_at: ins.data?.created_at ?? null, updated_at: ins.data?.updated_at ?? null });
          }
        } else {
          const up = await supabase.from("player_hqs").update(payload).eq("id", h.id);
          if (up.error) throw up.error;
        }
      }

      setHint("HQs saved ✅");
      setTimeout(() => setHint(null), 1200);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setSavingHqs(false);
    }
  };

  if (loading) {
    return <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>Loading profile…</div>;
  }

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>🪪 Player Profile {allianceName ? `— ${allianceName}` : `— ${code}`}</div>
          <div style={{ opacity: 0.75, fontSize: 12 }}>Auto-saves your profile. HQs save with the button.</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {savingProfile ? <span style={{ opacity: 0.8 }}>Saving…</span> : null}
          {savingHqs ? <span style={{ opacity: 0.8 }}>Saving HQs…</span> : null}
          {hint ? <span style={{ opacity: 0.9 }}>{hint}</span> : null}
        </div>
      </div>

      {err ? (
        <div style={{ marginTop: 10, padding: 10, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 10 }}>
          <b>Error:</b> {err}
        </div>
      ) : null}

      <div style={{ marginTop: 12, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ opacity: 0.8, fontSize: 12 }}>Game Name</span>
          <input value={profile.game_name ?? ""} onChange={(e) => setProfile((p) => ({ ...p, game_name: e.target.value }))} style={{ padding: 10, borderRadius: 10 }} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ opacity: 0.8, fontSize: 12 }}>Troop Type</span>
          <select value={profile.troop_type ?? ""} onChange={(e) => setProfile((p) => ({ ...p, troop_type: e.target.value || null }))} style={{ padding: 10, borderRadius: 10 }}>
            <option value="">—</option>
            {TROOP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ opacity: 0.8, fontSize: 12 }}>Troop Tier</span>
          <select value={profile.troop_tier ?? ""} onChange={(e) => setProfile((p) => ({ ...p, troop_tier: e.target.value || null }))} style={{ padding: 10, borderRadius: 10 }}>
            <option value="">—</option>
            {TROOP_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ opacity: 0.8, fontSize: 12 }}>March Size (no heroes)</span>
          <input type="number" value={profile.march_size_no_heroes ?? ""} onChange={(e) => setProfile((p) => ({ ...p, march_size_no_heroes: toInt(e.target.value) }))} style={{ padding: 10, borderRadius: 10 }} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ opacity: 0.8, fontSize: 12 }}>Rally Size</span>
          <input type="number" value={profile.rally_size ?? ""} onChange={(e) => setProfile((p) => ({ ...p, rally_size: toInt(e.target.value) }))} style={{ padding: 10, borderRadius: 10 }} />
        </label>
      </div>

      <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 900 }}>🏰 Your HQs (for {code})</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={addHq} style={{ padding: "8px 10px", borderRadius: 10 }}>+ Add HQ</button>
            <button onClick={saveAllHqs} disabled={savingHqs} style={{ padding: "8px 10px", borderRadius: 10, fontWeight: 800 }}>Save HQs</button>
          </div>
        </div>

        {hqs.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>No HQs yet — click <b>Add HQ</b>.</div>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
            {hqs.map((h) => {
              const key = String(h._localKey ?? h.id ?? uuid());
              return (
                <div key={key} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900 }}>HQ {h.hq_name ? `— ${h.hq_name}` : ""}</div>
                    <button onClick={() => deleteHq(h)} style={{ padding: "6px 10px", borderRadius: 10 }}>Delete</button>
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ opacity: 0.8, fontSize: 12 }}>HQ Name</span>
                      <input value={h.hq_name ?? ""} onChange={(e) => updateHq(key, { hq_name: e.target.value })} style={{ padding: 10, borderRadius: 10 }} />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ opacity: 0.8, fontSize: 12 }}>HQ Level</span>
                      <input type="number" value={h.hq_level ?? ""} onChange={(e) => updateHq(key, { hq_level: toInt(e.target.value) })} style={{ padding: 10, borderRadius: 10 }} />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ opacity: 0.8, fontSize: 12 }}>X</span>
                      <input type="number" value={h.coord_x ?? ""} onChange={(e) => updateHq(key, { coord_x: toInt(e.target.value) })} style={{ padding: 10, borderRadius: 10 }} />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ opacity: 0.8, fontSize: 12 }}>Y</span>
                      <input type="number" value={h.coord_y ?? ""} onChange={(e) => updateHq(key, { coord_y: toInt(e.target.value) })} style={{ padding: 10, borderRadius: 10 }} />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ opacity: 0.8, fontSize: 12 }}>Troop Type</span>
                      <select value={h.troop_type ?? ""} onChange={(e) => updateHq(key, { troop_type: e.target.value || null })} style={{ padding: 10, borderRadius: 10 }}>
                        <option value="">—</option>
                        {TROOP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ opacity: 0.8, fontSize: 12 }}>Troop Tier</span>
                      <select value={h.troop_tier ?? ""} onChange={(e) => updateHq(key, { troop_tier: e.target.value || null })} style={{ padding: 10, borderRadius: 10 }}>
                        <option value="">—</option>
                        {TROOP_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ opacity: 0.8, fontSize: 12 }}>March Size (no heroes)</span>
                      <input type="number" value={h.march_size_no_heroes ?? ""} onChange={(e) => updateHq(key, { march_size_no_heroes: toInt(e.target.value) })} style={{ padding: 10, borderRadius: 10 }} />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ opacity: 0.8, fontSize: 12 }}>Rally Size</span>
                      <input type="number" value={h.rally_size ?? ""} onChange={(e) => updateHq(key, { rally_size: toInt(e.target.value) })} style={{ padding: 10, borderRadius: 10 }} />
                    </label>
                  </div>

                  <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>Tip: Add as many HQs as you want for this alliance.</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
