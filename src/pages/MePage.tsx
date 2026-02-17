import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type AllianceMembership = {
  alliance_code: string;
  role?: string | null;
};

type ProfileRow = {
  id: string;
  player_id: string;
  alliance_code: string;
  game_name?: string | null;
  troop_type?: string | null;
  troop_tier?: string | null;
  march_size?: number | null;
  rally_size?: number | null;
};

type HqRow = {
  id: string;
  // foreign key may vary; we keep it flexible
  profile_id?: string;
  hq_name?: string | null;
  hq_level?: number | null;
};

const TROOP_TYPES = ["Shooter", "Rider", "Fighter"] as const;
const TROOP_TIERS = ["T5","T6","T7","T8","T9","T10","T11","T12","T13","T14"] as const;

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function toIntOrNull(v: string) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (!/^[0-9]+$/.test(s)) return null;
  return parseInt(s, 10);
}

function looksMissingColumn(errMsg: string, col: string) {
  const m = (errMsg || "").toLowerCase();
  return m.includes("does not exist") && m.includes(col.toLowerCase());
}

export default function MePage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

  const [memberships, setMemberships] = useState<AllianceMembership[]>([]);
  const [selectedAlliance, setSelectedAlliance] = useState<string>("");

  // profile fields
  const [profileId, setProfileId] = useState<string | null>(null);
  const [gameName, setGameName] = useState("");
  const [troopType, setTroopType] = useState<(typeof TROOP_TYPES)[number]>("Shooter");
  const [troopTier, setTroopTier] = useState<(typeof TROOP_TIERS)[number]>("T10");
  const [marchSize, setMarchSize] = useState("");
  const [rallySize, setRallySize] = useState("");

  // HQs
  const [hqs, setHqs] = useState<HqRow[]>([]);
  const [hqName, setHqName] = useState("");
  const [hqLevel, setHqLevel] = useState("");

  const selectedRole = useMemo(() => {
    const m = memberships.find(x => upper(x.alliance_code) === upper(selectedAlliance));
    return String(m?.role ?? "").toLowerCase();
  }, [memberships, selectedAlliance]);

  const isManager = useMemo(() => ["owner","r4","r5"].includes(selectedRole), [selectedRole]);

  const loadPlayerAndMemberships = async () => {
    setErr(null);
    setLoading(true);

    try {
      const { data: u, error: uErr } = await supabase.auth.getUser();
      if (uErr) throw uErr;

      const uid = u?.user?.id ?? null;
      setAuthUserId(uid);

      if (!uid) {
        setPlayerId(null);
        setMemberships([]);
        setSelectedAlliance("");
        return;
      }

      const { data: p, error: pErr } = await supabase
        .from("players")
        .select("id")
        .eq("auth_user_id", uid)
        .maybeSingle();

      if (pErr) throw pErr;

      if (!p?.id) {
        setPlayerId(null);
        setMemberships([]);
        setSelectedAlliance("");
        setErr("No player row found yet. Complete onboarding once, then return to /me.");
        return;
      }

      setPlayerId(p.id);

      const { data: pa, error: paErr } = await supabase
        .from("player_alliances")
        .select("alliance_code,role")
        .eq("player_id", p.id);

      if (paErr) throw paErr;

      const list = (pa ?? []) as any[];
      const norm = list
        .map(r => ({ alliance_code: upper(r.alliance_code), role: r.role ?? null }))
        .filter(r => r.alliance_code);

      setMemberships(norm);

      if (!selectedAlliance && norm.length > 0) {
        setSelectedAlliance(norm[0].alliance_code);
      }
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  // Profile load: no reliance on upsert constraints
  const loadProfile = async (pid: string, ac: string): Promise<ProfileRow | null> => {
    const { data, error } = await supabase
      .from("player_alliance_profiles")
      .select("id,player_id,alliance_code,game_name,troop_type,troop_tier,march_size,rally_size")
      .eq("player_id", pid)
      .eq("alliance_code", upper(ac))
      .maybeSingle();

    if (error) throw error;
    return (data as any) ?? null;
  };

  const loadHqsForProfile = async (profId: string) => {
    // column name is uncertain; try common candidates
    const candidates = ["profile_id", "player_alliance_profile_id", "player_profile_id"];
    let lastErr: any = null;

    for (const col of candidates) {
      const { data, error } = await supabase
        .from("player_hqs")
        .select("id,hq_name,hq_level")
        .eq(col as any, profId)
        .order("created_at", { ascending: true });

      if (!error) {
        setHqs((data ?? []) as any as HqRow[]);
        return;
      }

      lastErr = error;
      if (!looksMissingColumn(error.message || "", col)) {
        // different error -> stop
        throw error;
      }
    }

    // if all candidates failed, surface last error
    if (lastErr) throw lastErr;
  };

  const loadProfileAndHqs = async (pid: string, ac: string) => {
    setErr(null);
    try {
      const prof = await loadProfile(pid, ac);

      if (!prof?.id) {
        setProfileId(null);
        setGameName("");
        setTroopType("Shooter");
        setTroopTier("T10");
        setMarchSize("");
        setRallySize("");
        setHqs([]);
        return;
      }

      setProfileId(prof.id);
      setGameName(String(prof.game_name ?? ""));
      setTroopType((TROOP_TYPES as any).includes(prof.troop_type) ? (prof.troop_type as any) : "Shooter");
      setTroopTier((TROOP_TIERS as any).includes(prof.troop_tier) ? (prof.troop_tier as any) : "T10");
      setMarchSize(prof.march_size == null ? "" : String(prof.march_size));
      setRallySize(prof.rally_size == null ? "" : String(prof.rally_size));

      await loadHqsForProfile(prof.id);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  };

  const saveProfile = async () => {
    if (!playerId) return;
    if (!selectedAlliance) return;

    setErr(null);

    const payload: any = {
      player_id: playerId,
      alliance_code: upper(selectedAlliance),
      game_name: gameName.trim() || null,
      troop_type: troopType,
      troop_tier: troopTier,
      march_size: toIntOrNull(marchSize),
      rally_size: toIntOrNull(rallySize),
    };

    try {
      // check existing
      const existing = await loadProfile(playerId, selectedAlliance);

      if (existing?.id) {
        const { error } = await supabase
          .from("player_alliance_profiles")
          .update(payload)
          .eq("id", existing.id);

        if (error) throw error;
        setProfileId(existing.id);
      } else {
        const { data, error } = await supabase
          .from("player_alliance_profiles")
          .insert(payload)
          .select("id")
          .maybeSingle();

        if (error) throw error;
        setProfileId((data as any)?.id ?? null);
      }

      await loadProfileAndHqs(playerId, selectedAlliance);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  };

  const addHq = async () => {
    if (!playerId || !selectedAlliance) return;

    // Ensure profile exists
    if (!profileId) {
      await saveProfile();
    }
    if (!profileId) return;

    const name = hqName.trim();
    const lvl = toIntOrNull(hqLevel);

    if (!name) return alert("HQ Name is required");
    if (lvl == null) return alert("HQ Level must be a number");

    setErr(null);

    // Try possible FK column names
    const candidates = ["profile_id", "player_alliance_profile_id", "player_profile_id"];
    let lastErr: any = null;

    for (const col of candidates) {
      const row: any = { hq_name: name, hq_level: lvl };
      row[col] = profileId;

      const { error } = await supabase.from("player_hqs").insert(row);
      if (!error) {
        setHqName("");
        setHqLevel("");
        await loadProfileAndHqs(playerId, selectedAlliance);
        return;
      }

      lastErr = error;
      if (!looksMissingColumn(error.message || "", col)) {
        setErr(error.message);
        return;
      }
    }

    if (lastErr) setErr(lastErr.message);
  };

  const removeHq = async (id: string) => {
    if (!confirm("Delete this HQ?")) return;
    setErr(null);

    const { error } = await supabase.from("player_hqs").delete().eq("id", id);
    if (error) {
      setErr(error.message);
      return;
    }

    if (playerId && selectedAlliance) {
      await loadProfileAndHqs(playerId, selectedAlliance);
    }
  };

  useEffect(() => { loadPlayerAndMemberships(); }, []);
  useEffect(() => {
    if (!playerId || !selectedAlliance) return;
    loadProfileAndHqs(playerId, selectedAlliance);
  }, [playerId, selectedAlliance]);

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;

  if (!authUserId) {
    return (
      <div style={{ padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>My Profile</h2>
        <div style={{ opacity: 0.8 }}>Please sign in to manage your profile.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>👤 My Profile</h2>

      {err ? (
        <div style={{ marginTop: 10, padding: 12, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 10 }}>
          <b>Error:</b> {err}
        </div>
      ) : null}

      <div style={{ marginTop: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <b>Alliance</b>
            <div style={{ opacity: 0.75, fontSize: 12 }}>Choose which alliance profile you’re editing</div>
          </div>

          <select
            value={selectedAlliance}
            onChange={(e) => setSelectedAlliance(upper(e.target.value))}
            style={{ padding: 8, borderRadius: 10, minWidth: 200 }}
          >
            {memberships.length === 0 ? <option value="">(No alliances)</option> : null}
            {memberships.map((m) => (
              <option key={m.alliance_code} value={m.alliance_code}>
                {m.alliance_code}{m.role ? " (" + String(m.role) + ")" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <b>Player Details</b>
            <div style={{ opacity: 0.75, fontSize: 12 }}>
              Saved per alliance. HQ Map + Calendar are view-only unless Owner/R4/R5.
            </div>
          </div>
          <button onClick={saveProfile} style={{ padding: "8px 12px", borderRadius: 10 }}>💾 Save</button>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Game Name</span>
            <input value={gameName} onChange={(e) => setGameName(e.target.value)} placeholder="Your in-game name" />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Troop Type</span>
            <select value={troopType} onChange={(e) => setTroopType(e.target.value as any)}>
              {TROOP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Troop Tier</span>
            <select value={troopTier} onChange={(e) => setTroopTier(e.target.value as any)}>
              {TROOP_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>March Size (no heroes)</span>
            <input value={marchSize} onChange={(e) => setMarchSize(e.target.value)} placeholder="e.g. 450000" inputMode="numeric" />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Rally Size</span>
            <input value={rallySize} onChange={(e) => setRallySize(e.target.value)} placeholder="e.g. 1200000" inputMode="numeric" />
          </label>

          <div style={{ opacity: 0.75, fontSize: 12, alignSelf: "end" }}>
            Your role for this alliance: <b>{selectedRole || "member"}</b> {isManager ? "(manager)" : "(view-only)"}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
        <div>
          <b>HQs</b>
          <div style={{ opacity: 0.75, fontSize: 12 }}>Add as many HQs as you want for this alliance profile.</div>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>HQ Name</span>
            <input value={hqName} onChange={(e) => setHqName(e.target.value)} placeholder="Main / Farm / Alt…" />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>HQ Level</span>
            <input value={hqLevel} onChange={(e) => setHqLevel(e.target.value)} placeholder="e.g. 30" inputMode="numeric" />
          </label>

          <button onClick={addHq} style={{ padding: "8px 12px", borderRadius: 10 }}>➕ Add HQ</button>
        </div>

        {hqs.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>No HQs yet.</div>
        ) : (
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {hqs.map((h) => (
              <div key={h.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: 10, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{h.hq_name ?? "HQ"}</div>
                  <div style={{ opacity: 0.8, fontSize: 12 }}>Level: {h.hq_level ?? "—"}</div>
                </div>
                <button onClick={() => removeHq(h.id)} style={{ padding: "6px 10px", borderRadius: 10 }}>🗑 Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
        Tip: Alliance dashboards are under <code>/dashboard/&lt;ALLIANCE&gt;</code>. This page saves your personal profile per alliance.
      </div>
    </div>
  );
}
