import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

type TroopType = "Shooter" | "Rider" | "Fighter";
type TroopTier =
  | "T5" | "T6" | "T7" | "T8" | "T9" | "T10" | "T11" | "T12" | "T13" | "T14";

const TROOP_TYPES: TroopType[] = ["Shooter", "Rider", "Fighter"];
const TROOP_TIERS: TroopTier[] = ["T5","T6","T7","T8","T9","T10","T11","T12","T13","T14"];

type ProfileRow = Record<string, any>;
type HqRow = Record<string, any>;

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function toIntOrNull(v: any) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

export default function PlayerProfilePage() {
  const params = useParams();
  const allianceCode = useMemo(() => upper((params as any)?.allianceCode), [params]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Profile fields (per alliance)
  const [gameName, setGameName] = useState("");
  const [troopType, setTroopType] = useState<TroopType>("Shooter");
  const [troopTier, setTroopTier] = useState<TroopTier>("T10");

  // HQs (unlimited per alliance)
  type UiHq = {
    _tmpId: string;
    id?: string;
    hqName: string;
    hqLevel: string;
    marchSize: string;
    rallySize: string;
  };
  const [hqs, setHqs] = useState<UiHq[]>([]);

  // Load current user -> players.id -> profile + HQs
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

        // players row
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
        setPlayerId(pid);

        // profile row (try alliance_code first)
        let prof: ProfileRow | null = null;

        const r1 = await supabase
          .from("player_alliance_profiles")
          .select("*")
          .eq("player_id", pid)
          .eq("alliance_code", allianceCode)
          .maybeSingle();

        if (!r1.error) {
          prof = (r1.data as any) ?? null;
        } else {
          // fallback: some schemas might use alliance_id or code
          const msg = String(r1.error.message || "").toLowerCase();
          if (msg.includes("alliance_code")) {
            const r2 = await supabase
              .from("player_alliance_profiles")
              .select("*")
              .eq("player_id", pid)
              .eq("alliance", allianceCode)
              .maybeSingle();
            if (!r2.error) prof = (r2.data as any) ?? null;
          } else {
            throw r1.error;
          }
        }

        if (cancelled) return;

        if (prof?.id) {
          setProfileId(String(prof.id));
          setGameName(String(prof.game_name ?? prof.gameName ?? ""));
          setTroopType((prof.troop_type ?? prof.troopType ?? "Shooter") as any);
          setTroopTier((prof.troop_tier ?? prof.troopTier ?? "T10") as any);

          // HQs
          const { data: hqRows, error: hqErr } = await supabase
            .from("player_hqs")
            .select("*")
            .eq("profile_id", prof.id)
            .order("created_at", { ascending: true });

          if (hqErr) throw hqErr;

          const ui = (hqRows ?? []).map((r: any, i: number) => ({
            _tmpId: String(r.id ?? `row_${i}`),
            id: r.id,
            hqName: String(r.hq_name ?? r.hqName ?? ""),
            hqLevel: String(r.hq_level ?? r.hqLevel ?? ""),
            marchSize: String(r.march_size ?? r.marchSize ?? r.march_size_without_heros ?? r.march_size_without_heroes ?? ""),
            rallySize: String(r.rally_size ?? r.rallySize ?? ""),
          }));

          setHqs(ui.length ? ui : [{
            _tmpId: String(Date.now()),
            hqName: "",
            hqLevel: "",
            marchSize: "",
            rallySize: "",
          }]);
        } else {
          // no profile yet — start with one HQ row
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
  };

  const removeHq = async (tmpId: string) => {
    const row = (hqs ?? []).find((x) => x._tmpId === tmpId);
    setHqs((prev) => (prev ?? []).filter((x) => x._tmpId !== tmpId));

    // best-effort delete on server if it existed
    if (row?.id) {
      try {
        await supabase.from("player_hqs").delete().eq("id", row.id);
      } catch {}
    }
  };

  const saveAll = async () => {
    if (!playerId) return;
    if (!allianceCode) return;

    // basic validation
    const gn = gameName.trim();
    if (!gn) return alert("Game Name is required.");

    const cleanedHqs = (hqs ?? []).map((h) => ({
      ...h,
      hqName: (h.hqName ?? "").trim(),
    }));

    if (cleanedHqs.some((h) => !h.hqName)) {
      return alert("Each HQ needs an HQ Name (you can add multiple HQs).");
    }

    setSaving(true);
    setErr(null);

    try {
      // Create/update profile
      const profilePayload: any = {
        player_id: playerId,
        alliance_code: allianceCode,
        game_name: gn,
        troop_type: troopType,
        troop_tier: troopTier,
      };

      let profId = profileId;

      if (profId) {
        const { error } = await supabase
          .from("player_alliance_profiles")
          .update(profilePayload)
          .eq("id", profId);

        if (error) {
          // fallback if column names differ a bit
          const msg = String(error.message || "").toLowerCase();
          if (msg.includes("alliance_code")) {
            const altPayload: any = {
              player_id: playerId,
              alliance: allianceCode,
              game_name: gn,
              troop_type: troopType,
              troop_tier: troopTier,
            };
            const u2 = await supabase.from("player_alliance_profiles").update(altPayload).eq("id", profId);
            if (u2.error) throw u2.error;
          } else {
            throw error;
          }
        }
      } else {
        const { data, error } = await supabase
          .from("player_alliance_profiles")
          .insert(profilePayload)
          .select("id")
          .maybeSingle();

        if (error) {
          const msg = String(error.message || "").toLowerCase();
          if (msg.includes("alliance_code")) {
            const altPayload: any = {
              player_id: playerId,
              alliance: allianceCode,
              game_name: gn,
              troop_type: troopType,
              troop_tier: troopTier,
            };
            const r2 = await supabase.from("player_alliance_profiles").insert(altPayload).select("id").maybeSingle();
            if (r2.error) throw r2.error;
            profId = String((r2.data as any)?.id ?? "");
          } else {
            throw error;
          }
        } else {
          profId = String((data as any)?.id ?? "");
        }

        if (!profId) throw new Error("Profile insert succeeded but returned no id.");
        setProfileId(profId);
      }

      // Upsert HQ rows
      for (const h of cleanedHqs) {
        const hqPayload: any = {
          profile_id: profId,
          hq_name: h.hqName,
          hq_level: toIntOrNull(h.hqLevel),
          march_size: toIntOrNull(h.marchSize),
          rally_size: toIntOrNull(h.rallySize),
        };

        if (h.id) {
          const { error } = await supabase.from("player_hqs").update(hqPayload).eq("id", h.id);
          if (error) throw error;
        } else {
          const { data, error } = await supabase.from("player_hqs").insert(hqPayload).select("id").maybeSingle();
          if (error) throw error;
          const newId = String((data as any)?.id ?? "");
          if (newId) {
            setHqs((prev) => (prev ?? []).map((x) => x._tmpId === h._tmpId ? { ...x, id: newId } : x));
          }
        }
      }

      alert("✅ Saved!");
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? String(e));
      alert(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 18 }}>Loading your profile…</div>;
  }

  return (
    <div style={{ padding: 18, maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>👤 My Profile & HQs — {allianceCode}</h2>
        <Link to={`/dashboard/${encodeURIComponent(allianceCode)}`} style={{ opacity: 0.85 }}>
          ← Back to Dashboard
        </Link>
      </div>

      {err ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 12 }}>
          <b>Error:</b> {err}
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

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={saveAll} disabled={saving} style={{ padding: "10px 14px", borderRadius: 12 }}>
              {saving ? "Saving…" : "Save Profile + HQs"}
            </button>
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
          Tip: If you’re in multiple alliances, you’ll have separate profiles/HQs per alliance.
        </div>
      </div>
    </div>
  );
}
