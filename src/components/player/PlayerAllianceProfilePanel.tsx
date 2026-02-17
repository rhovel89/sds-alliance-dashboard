import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

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
  id: string;
  profile_id: string;
  hq_name: string;
  hq_level: number | null;
};

const TROOP_TYPES = ["Shooter", "Rider", "Fighter"] as const;
const TROOP_TIERS = ["T5","T6","T7","T8","T9","T10","T11","T12","T13","T14"] as const;

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function toIntOrNull(v: any) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

export default function PlayerAllianceProfilePanel(props: {
  allianceCode: string;
  allianceName: string;
}) {
  const allianceCode = useMemo(() => upper(props.allianceCode), [props.allianceCode]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [playerId, setPlayerId] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [hqs, setHqs] = useState<HqRow[]>([]);

  // form fields
  const [gameName, setGameName] = useState("");
  const [troopType, setTroopType] = useState<string>("");
  const [troopTier, setTroopTier] = useState<string>("");
  const [marchSize, setMarchSize] = useState<string>("");
  const [rallySize, setRallySize] = useState<string>("");

  // HQ add fields
  const [newHqName, setNewHqName] = useState("");
  const [newHqLevel, setNewHqLevel] = useState<string>("");

  const load = async () => {
    setLoading(true);
    setErr(null);

    try {
      const { data: u, error: uErr } = await supabase.auth.getUser();
      if (uErr) throw uErr;
      const uid = u?.user?.id;
      if (!uid) {
        setPlayerId(null);
        setProfile(null);
        setHqs([]);
        return;
      }

      const { data: p, error: pErr } = await supabase
        .from("players")
        .select("id")
        .eq("auth_user_id", uid)
        .maybeSingle();

      if (pErr) throw pErr;
      const pid = (p as any)?.id ?? null;
      setPlayerId(pid);

      if (!pid || !allianceCode) {
        setProfile(null);
        setHqs([]);
        return;
      }

      const { data: pr, error: prErr } = await supabase
        .from("player_alliance_profiles")
        .select("*")
        .eq("player_id", pid)
        .eq("alliance_code", allianceCode)
        .maybeSingle();

      if (prErr) throw prErr;

      const prRow = (pr as any) as ProfileRow | null;
      setProfile(prRow);

      setGameName(String(prRow?.game_name ?? ""));
      setTroopType(String(prRow?.troop_type ?? ""));
      setTroopTier(String(prRow?.troop_tier ?? ""));
      setMarchSize(prRow?.march_size_no_heroes == null ? "" : String(prRow.march_size_no_heroes));
      setRallySize(prRow?.rally_size == null ? "" : String(prRow.rally_size));

      if (prRow?.id) {
        const { data: h, error: hErr } = await supabase
          .from("player_alliance_hqs")
          .select("*")
          .eq("profile_id", prRow.id)
          .order("created_at", { ascending: true });

        if (hErr) throw hErr;
        setHqs((h ?? []) as any[]);
      } else {
        setHqs([]);
      }
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allianceCode]);

  const saveProfile = async () => {
    setErr(null);
    if (!playerId || !allianceCode) return;

    // minimal validation
    if (troopType && !TROOP_TYPES.includes(troopType as any)) {
      return setErr("Invalid troop type.");
    }
    if (troopTier && !TROOP_TIERS.includes(troopTier as any)) {
      return setErr("Invalid troop tier.");
    }

    setSaving(true);
    try {
      const payload: any = {
        player_id: playerId,
        alliance_code: allianceCode,
        game_name: gameName.trim() || null,
        troop_type: troopType || null,
        troop_tier: troopTier || null,
        march_size_no_heroes: toIntOrNull(marchSize),
        rally_size: toIntOrNull(rallySize),
      };

      // upsert by unique(player_id, alliance_code)
      const { data: up, error: upErr } = await supabase
        .from("player_alliance_profiles")
        .upsert(payload, { onConflict: "player_id,alliance_code" })
        .select("*")
        .maybeSingle();

      if (upErr) throw upErr;

      setProfile((up as any) ?? null);

      // reload HQs if profile was created
      const prId = (up as any)?.id;
      if (prId) {
        const { data: h, error: hErr } = await supabase
          .from("player_alliance_hqs")
          .select("*")
          .eq("profile_id", prId)
          .order("created_at", { ascending: true });
        if (hErr) throw hErr;
        setHqs((h ?? []) as any[]);
      }
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const addHq = async () => {
    setErr(null);
    if (!playerId || !allianceCode) return;

    const name = newHqName.trim();
    if (!name) return setErr("HQ Name is required.");

    // ensure profile exists first
    let pr = profile;
    if (!pr?.id) {
      await saveProfile();
      pr = profile;
    }

    const prId = pr?.id;
    if (!prId) {
      return setErr("Could not create profile. Try saving profile first.");
    }

    setSaving(true);
    try {
      const payload: any = {
        profile_id: prId,
        hq_name: name,
        hq_level: toIntOrNull(newHqLevel),
      };

      const { error: iErr } = await supabase.from("player_alliance_hqs").insert(payload);
      if (iErr) throw iErr;

      setNewHqName("");
      setNewHqLevel("");

      const { data: h, error: hErr } = await supabase
        .from("player_alliance_hqs")
        .select("*")
        .eq("profile_id", prId)
        .order("created_at", { ascending: true });
      if (hErr) throw hErr;
      setHqs((h ?? []) as any[]);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const editHq = async (hq: HqRow) => {
    const nextName = window.prompt("HQ Name:", hq.hq_name);
    if (nextName == null) return;

    const nextLvl = window.prompt("HQ Level:", hq.hq_level == null ? "" : String(hq.hq_level));
    if (nextLvl == null) return;

    setSaving(true);
    setErr(null);
    try {
      const patch: any = {
        hq_name: nextName.trim() || hq.hq_name,
        hq_level: toIntOrNull(nextLvl),
      };

      const { error } = await supabase.from("player_alliance_hqs").update(patch).eq("id", hq.id);
      if (error) throw error;

      // refresh list
      if (profile?.id) {
        const { data: h, error: hErr } = await supabase
          .from("player_alliance_hqs")
          .select("*")
          .eq("profile_id", profile.id)
          .order("created_at", { ascending: true });
        if (hErr) throw hErr;
        setHqs((h ?? []) as any[]);
      }
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const deleteHq = async (hq: HqRow) => {
    if (!window.confirm(`Delete HQ "${hq.hq_name}"?`)) return;

    setSaving(true);
    setErr(null);
    try {
      const { error } = await supabase.from("player_alliance_hqs").delete().eq("id", hq.id);
      if (error) throw error;

      setHqs((prev) => prev.filter((x) => x.id !== hq.id));
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)" }}>
        Loading your profile…
      </div>
    );
  }

  if (!allianceCode) {
    return null;
  }

  if (!playerId) {
    return (
      <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)" }}>
        <b>Profile</b>
        <div style={{ marginTop: 8, opacity: 0.8 }}>
          No player record found for your login yet. An Owner/Admin may need to create/assign you in <code>players</code>.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Your Profile • {props.allianceName || allianceCode}</div>
          <div style={{ opacity: 0.75, fontSize: 12 }}>
            This profile is per-alliance. If you’re in multiple alliances, each one has its own profile + HQ list.
          </div>
        </div>

        <button onClick={saveProfile} disabled={saving} style={{ padding: "8px 12px", borderRadius: 10 }}>
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </div>

      {err ? (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 10, border: "1px solid rgba(255,0,0,0.35)" }}>
          <b>Error:</b> {err}
        </div>
      ) : null}

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ opacity: 0.8, fontSize: 12 }}>Game Name</span>
          <input value={gameName} onChange={(e) => setGameName(e.target.value)} style={{ padding: 10, borderRadius: 10 }} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ opacity: 0.8, fontSize: 12 }}>Troop Type</span>
          <select value={troopType} onChange={(e) => setTroopType(e.target.value)} style={{ padding: 10, borderRadius: 10 }}>
            <option value="">(select)</option>
            {TROOP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ opacity: 0.8, fontSize: 12 }}>Troop Tier</span>
          <select value={troopTier} onChange={(e) => setTroopTier(e.target.value)} style={{ padding: 10, borderRadius: 10 }}>
            <option value="">(select)</option>
            {TROOP_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ opacity: 0.8, fontSize: 12 }}>March Size (no heroes)</span>
          <input type="number" value={marchSize} onChange={(e) => setMarchSize(e.target.value)} style={{ padding: 10, borderRadius: 10 }} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ opacity: 0.8, fontSize: 12 }}>Rally Size</span>
          <input type="number" value={rallySize} onChange={(e) => setRallySize(e.target.value)} style={{ padding: 10, borderRadius: 10 }} />
        </label>
      </div>

      <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>HQs (add as many as you want)</div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ opacity: 0.8, fontSize: 12 }}>HQ Name</span>
            <input value={newHqName} onChange={(e) => setNewHqName(e.target.value)} style={{ padding: 10, borderRadius: 10, minWidth: 220 }} />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ opacity: 0.8, fontSize: 12 }}>HQ Level</span>
            <input type="number" value={newHqLevel} onChange={(e) => setNewHqLevel(e.target.value)} style={{ padding: 10, borderRadius: 10, width: 120 }} />
          </label>

          <button onClick={addHq} disabled={saving} style={{ padding: "10px 12px", borderRadius: 10 }}>
            ➕ Add HQ
          </button>
        </div>

        {hqs.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>No HQs added yet.</div>
        ) : (
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {hqs.map((hq) => (
              <div key={hq.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 900 }}>{hq.hq_name}</div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>Level: {hq.hq_level == null ? "—" : hq.hq_level}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => editHq(hq)} disabled={saving} style={{ padding: "8px 10px", borderRadius: 10 }}>Edit</button>
                  <button onClick={() => deleteHq(hq)} disabled={saving} style={{ padding: "8px 10px", borderRadius: 10, color: "crimson" }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
