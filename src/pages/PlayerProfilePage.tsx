import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

type TroopType = "Shooter" | "Rider" | "Fighter";
type TroopTier = "T5" | "T6" | "T7" | "T8" | "T9" | "T10" | "T11" | "T12" | "T13" | "T14";

const TROOP_TYPES: TroopType[] = ["Shooter", "Rider", "Fighter"];
const TROOP_TIERS: TroopTier[] = ["T5","T6","T7","T8","T9","T10","T11","T12","T13","T14"];

type AnyRow = Record<string, any>;

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}
function toIntOrNull(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

type UiHq = {
  _tmpId: string;
  id?: string;
  hqName: string;
  hqLevel: string;
  marchSize: string;
  rallySize: string;
};

export default function PlayerProfilePage() {
  const params = useParams();
  const allianceCode = useMemo(() => upper((params as any)?.allianceCode), [params]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  const [memberships, setMemberships] = useState<{ alliance_code: string; role?: string | null }[]>([]);

  // Profile fields
  const [gameName, setGameName] = useState("");
  const [troopType, setTroopType] = useState<TroopType>("Shooter");
  const [troopTier, setTroopTier] = useState<TroopTier>("T10");

  // HQ rows
  const [hqs, setHqs] = useState<UiHq[]>([]);

  // Autosave state
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const skipNextAutosave = useRef(false);

  // Load: auth -> players.id -> memberships -> profile -> hqs
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id ?? null;
        if (!uid) {
          setErr("Not signed in.");
          return;
        }

        const { data: p, error: pErr } = await supabase
          .from("players")
          .select("id")
          .eq("auth_user_id", uid)
          .maybeSingle();

        if (pErr) throw pErr;
        const pid = (p as any)?.id ?? null;
        if (!pid) {
          setErr("No player record found. Please complete onboarding.");
          return;
        }
        if (cancelled) return;
        setPlayerId(String(pid));

        // memberships (for quick switching)
        try {
          const { data: ms } = await supabase
            .from("player_alliances")
            .select("alliance_code,role")
            .eq("player_id", pid)
            .order("alliance_code", { ascending: true });
          if (!cancelled) setMemberships((ms as any) ?? []);
        } catch {}

        // profile (per alliance)
        const { data: prof, error: profErr } = await supabase
          .from("player_alliance_profiles")
          .select("*")
          .eq("player_id", pid)
          .eq("alliance_code", allianceCode)
          .maybeSingle();

        if (profErr) throw profErr;

        if (cancelled) return;

        if (prof?.id) {
          setProfileId(String(prof.id));
          setGameName(String(prof.game_name ?? ""));
          setTroopType((prof.troop_type ?? "Shooter") as any);
          setTroopTier((prof.troop_tier ?? "T10") as any);

          const { data: hqRows, error: hqErr } = await supabase
            .from("player_hqs")
            .select("*")
            .eq("profile_id", prof.id)
            .order("created_at", { ascending: true });

          if (hqErr) throw hqErr;

          const ui = (hqRows ?? []).map((r: any, i: number) => ({
            _tmpId: String(r.id ?? `row_${i}`),
            id: r.id,
            hqName: String(r.hq_name ?? ""),
            hqLevel: String(r.hq_level ?? ""),
            marchSize: String(r.march_size ?? ""),
            rallySize: String(r.rally_size ?? ""),
          }));

          setHqs(
            ui.length
              ? ui
              : [{
                  _tmpId: String(Date.now()),
                  hqName: "",
                  hqLevel: "",
                  marchSize: "",
                  rallySize: "",
                }]
          );
        } else {
          // new profile
          setProfileId(null);
          setGameName("");
          setTroopType("Shooter");
          setTroopTier("T10");
          setHqs([{
            _tmpId: String(Date.now()),
            hqName: "",
            hqLevel: "",
            marchSize: "",
            rallySize: "",
          }]);
        }

        setDirty(false);
        setLastSavedAt(null);
      } catch (e: any) {
        setErr(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [allianceCode]);

  const addHq = () => {
    setHqs((prev) => [
      ...(prev ?? []),
      {
        _tmpId: String(Date.now() + Math.random()),
        hqName: "",
        hqLevel: "",
        marchSize: "",
        rallySize: "",
      },
    ]);
    setDirty(true);
  };

  const removeHq = async (tmpId: string) => {
    const row = (hqs ?? []).find((x) => x._tmpId === tmpId);
    setHqs((prev) => (prev ?? []).filter((x) => x._tmpId !== tmpId));
    setDirty(true);

    // best-effort delete on server if existed
    if (row?.id) {
      try { await supabase.from("player_hqs").delete().eq("id", row.id); } catch {}
    }
  };

  const saveAll = async (opts?: { silent?: boolean }) => {
    if (!playerId) return;
    if (!allianceCode) return;

    const silent = Boolean(opts?.silent);

    const gn = gameName.trim();
    if (!gn) {
      if (!silent) alert("Game Name is required.");
      return;
    }

    const cleaned = (hqs ?? []).map((h) => ({
      ...h,
      hqName: (h.hqName ?? "").trim(),
    }));

    if (cleaned.some((h) => !h.hqName)) {
      if (!silent) alert("Each HQ needs an HQ Name.");
      return;
    }

    setSaving(true);
    setErr(null);

    try {
      // 1) profile: update-if-exists else insert
      const payload: AnyRow = {
        player_id: playerId,
        alliance_code: allianceCode,
        game_name: gn,
        troop_type: troopType,
        troop_tier: troopTier,
        updated_at: new Date().toISOString(),
      };

      let profId = profileId;

      if (profId) {
        const { error } = await supabase
          .from("player_alliance_profiles")
          .update(payload)
          .eq("id", profId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("player_alliance_profiles")
          .insert({ ...payload, created_at: new Date().toISOString() })
          .select("id")
          .maybeSingle();

        if (error) throw error;

        profId = String((data as any)?.id ?? "");
        if (!profId) throw new Error("Profile insert returned no id.");
        setProfileId(profId);
      }

      // 2) HQs
      for (const h of cleaned) {
        const hqPayload: AnyRow = {
          profile_id: profId,
          hq_name: h.hqName,
          hq_level: toIntOrNull(h.hqLevel),
          march_size: toIntOrNull(h.marchSize),
          rally_size: toIntOrNull(h.rallySize),
          updated_at: new Date().toISOString(),
        };

        if (h.id) {
          const { error } = await supabase.from("player_hqs").update(hqPayload).eq("id", h.id);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from("player_hqs")
            .insert({ ...hqPayload, created_at: new Date().toISOString() })
            .select("id")
            .maybeSingle();

          if (error) throw error;

          const newId = String((data as any)?.id ?? "");
          if (newId) {
            skipNextAutosave.current = true; // prevent autosave loop from ID assignment
            setHqs((prev) => (prev ?? []).map((x) => x._tmpId === h._tmpId ? { ...x, id: newId } : x));
          }
        }
      }

      setDirty(false);
      setLastSavedAt(Date.now());
      if (!silent) alert("✅ Saved!");
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? String(e));
      if (!silent) alert(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  // Mark dirty on changes
  useEffect(() => {
    if (loading) return;
    setDirty(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameName, troopType, troopTier, JSON.stringify(hqs.map(h => [h.id,h.hqName,h.hqLevel,h.marchSize,h.rallySize]))]);

  // Autosave (debounced)
  useEffect(() => {
    if (loading) return;
    if (saving) return;
    if (!dirty) return;

    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }

    const t = window.setTimeout(() => {
      saveAll({ silent: true });
    }, 1200);

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, saving, loading, gameName, troopType, troopTier, JSON.stringify(hqs.map(h => [h.id,h.hqName,h.hqLevel,h.marchSize,h.rallySize]))]);

  if (loading) {
    return <div style={{ padding: 18 }}>Loading your profile…</div>;
  }

  const savedLabel =
    saving ? "Saving…" :
    (dirty ? "Unsaved changes" :
      (lastSavedAt ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}` : "Up to date"));

  return (
    <div style={{ padding: 18, maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>👤 My Profile & HQs — {allianceCode}</h2>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{savedLabel}</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => saveAll()} disabled={saving} style={{ padding: "10px 14px", borderRadius: 12 }}>
            Save now
          </button>
          <Link to={`/dashboard/${encodeURIComponent(allianceCode)}`} style={{ opacity: 0.85 }}>
            ← Back to Dashboard
          </Link>
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to={`/dashboard/${encodeURIComponent(allianceCode)}/hq-map-view`} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.14)" }}>
            🗺️ HQ Map (view)
          </Link>
          <Link to={`/dashboard/${encodeURIComponent(allianceCode)}/calendar-view`} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.14)" }}>
            📅 Calendar (view)
          </Link>
          <Link to={`/dashboard/${encodeURIComponent(allianceCode)}/guides`} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.14)" }}>
            📓 Guides
          </Link>
        </div>
      </div>

      {err ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 12 }}>
          <b>Error:</b> {err}
        </div>
      ) : null}

      {memberships?.length ? (
        <div style={{ marginTop: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 12 }}>
          <b>My Alliances</b>
          <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {memberships.map((m) => (
              <Link
                key={m.alliance_code}
                to={`/dashboard/${encodeURIComponent(String(m.alliance_code))}`}
                style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.14)" }}
              >
                {String(m.alliance_code).toUpperCase()}{m.role ? ` (${String(m.role)})` : ""}
              </Link>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
            Each alliance has its own profile + HQ list.
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 14 }}>
        <h3 style={{ marginTop: 0 }}>Profile (per alliance)</h3>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr", alignItems: "end" }}>
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

          <div style={{ fontSize: 12, opacity: 0.75 }}>
            Alliance: <b>{allianceCode}</b>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h3 style={{ marginTop: 0, marginBottom: 0 }}>🏰 HQs (unlimited)</h3>
          <button onClick={addHq} style={{ padding: "8px 12px", borderRadius: 12 }}>
            + Add HQ
          </button>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          {(hqs ?? []).map((h) => (
            <div key={h._tmpId} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14, padding: 12 }}>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1.2fr 0.6fr 0.8fr 0.8fr", alignItems: "end" }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>HQ Name</span>
                  <input value={h.hqName} onChange={(e) => setHqs((p) => (p ?? []).map((x) => x._tmpId === h._tmpId ? { ...x, hqName: e.target.value } : x))} placeholder="HQ name" />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span>HQ Level</span>
                  <input value={h.hqLevel} onChange={(e) => setHqs((p) => (p ?? []).map((x) => x._tmpId === h._tmpId ? { ...x, hqLevel: e.target.value } : x))} placeholder="e.g. 30" inputMode="numeric" />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span>March Size (no heroes)</span>
                  <input value={h.marchSize} onChange={(e) => setHqs((p) => (p ?? []).map((x) => x._tmpId === h._tmpId ? { ...x, marchSize: e.target.value } : x))} placeholder="e.g. 250000" inputMode="numeric" />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span>Rally Size</span>
                  <input value={h.rallySize} onChange={(e) => setHqs((p) => (p ?? []).map((x) => x._tmpId === h._tmpId ? { ...x, rallySize: e.target.value } : x))} placeholder="e.g. 2000000" inputMode="numeric" />
                </label>
              </div>

              <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => removeHq(h._tmpId)} style={{ padding: "8px 12px", borderRadius: 12 }}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
          Refresh-proof: this data is stored in Supabase and reloads on refresh.
        </div>
      </div>
    </div>
  );
}

