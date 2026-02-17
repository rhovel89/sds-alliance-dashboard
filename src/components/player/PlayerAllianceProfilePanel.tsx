
import { useEffect, useMemo, useState } from "react";

type TroopType = "" | "Shooter" | "Rider" | "Fighter";
type TroopTier =
  | ""
  | "T5" | "T6" | "T7" | "T8" | "T9"
  | "T10" | "T11" | "T12" | "T13" | "T14";

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
  user_id: string;
  alliance_id: string; // stores alliance code (text)
  profile_id: string | null;
  hq_name: string | null;
  hq_level: number | null;
  coord_x: number | null;
  coord_y: number | null;
  troop_type: string | null;
  troop_tier: string | null;
  march_size_no_heroes: number | null;
  rally_size: number | null;
};

function uuid() {
  // Browser-safe UUID generation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  // fallback (not perfect, but fine for UI; DB can also generate)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function toIntOrNull(v: any): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function shortRole(role?: string | null) {
  const r = String(role ?? "").toLowerCase();
  return r ? r.toUpperCase() : "";
}

export default function PlayerAllianceProfilePanel(props: {
  allianceCode: string;
  userId: string;
  playerId: string;
  role?: string | null;
}) {
  const allianceCode = String(props.allianceCode || "").toUpperCase();
  const isManager = useMemo(() => {
    const r = String(props.role ?? "").toLowerCase();
    return ["owner", "r4", "r5"].includes(r);
  }, [props.role]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>("");

  // profile fields
  const [gameName, setGameName] = useState("");
  const [troopType, setTroopType] = useState<TroopType>("");
  const [troopTier, setTroopTier] = useState<TroopTier>("");
  const [marchSize, setMarchSize] = useState<string>("");
  const [rallySize, setRallySize] = useState<string>("");

  const [profileId, setProfileId] = useState<string | null>(null);

  // HQs (unlimited)
  type HqForm = {
    id: string;
    hq_name: string;
    hq_level: string;
    coord_x: string;
    coord_y: string;
    troop_type: TroopType;
    troop_tier: TroopTier;
    march_size_no_heroes: string;
    rally_size: string;
  };

  const [hqs, setHqs] = useState<HqForm[]>([]);
  const [initialHqIds, setInitialHqIds] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    setStatus("");

    // 1) load profile
    const pRes = await supabase
      .from("player_alliance_profiles")
      .select("id,player_id,alliance_code,game_name,troop_type,troop_tier,march_size_no_heroes,rally_size")
      .eq("player_id", props.playerId)
      .eq("alliance_code", allianceCode)
      .maybeSingle();

    if (pRes.error) {
      console.error(pRes.error);
      setStatus(pRes.error.message);
    } else if (pRes.data) {
      const p = pRes.data as ProfileRow;
      setProfileId(p.id);
      setGameName(String(p.game_name ?? ""));
      setTroopType((p.troop_type as any) ?? "");
      setTroopTier((p.troop_tier as any) ?? "");
      setMarchSize(p.march_size_no_heroes == null ? "" : String(p.march_size_no_heroes));
      setRallySize(p.rally_size == null ? "" : String(p.rally_size));
    } else {
      setProfileId(null);
      setGameName("");
      setTroopType("");
      setTroopTier("");
      setMarchSize("");
      setRallySize("");
    }

    // 2) load HQs for this alliance + user
    const hRes = await supabase
      .from("player_hqs")
      .select("id,user_id,alliance_id,profile_id,hq_name,hq_level,coord_x,coord_y,troop_type,troop_tier,march_size_no_heroes,rally_size")
      .eq("user_id", props.userId)
      .eq("alliance_id", allianceCode)
      .order("created_at", { ascending: true });

    if (hRes.error) {
      console.error(hRes.error);
      setStatus(hRes.error.message);
      setHqs([]);
      setInitialHqIds([]);
    } else {
      const rows = (hRes.data ?? []) as HqRow[];
      setInitialHqIds(rows.map((r) => r.id));
      setHqs(
        rows.map((r) => ({
          id: r.id,
          hq_name: String(r.hq_name ?? ""),
          hq_level: r.hq_level == null ? "" : String(r.hq_level),
          coord_x: r.coord_x == null ? "" : String(r.coord_x),
          coord_y: r.coord_y == null ? "" : String(r.coord_y),
          troop_type: (r.troop_type as any) ?? "",
          troop_tier: (r.troop_tier as any) ?? "",
          march_size_no_heroes: r.march_size_no_heroes == null ? "" : String(r.march_size_no_heroes),
          rally_size: r.rally_size == null ? "" : String(r.rally_size),
        }))
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!props.userId || !props.playerId || !allianceCode) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.userId, props.playerId, allianceCode]);

  const addHq = () => {
    setHqs((prev) => [
      ...prev,
      {
        id: uuid(),
        hq_name: "",
        hq_level: "",
        coord_x: "",
        coord_y: "",
        troop_type: "",
        troop_tier: "",
        march_size_no_heroes: "",
        rally_size: "",
      },
    ]);
  };

  const removeHq = (id: string) => {
    setHqs((prev) => prev.filter((x) => x.id !== id));
  };

  const updateHq = (id: string, patch: Partial<HqForm>) => {
    setHqs((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const saveAll = async () => {
    setSaving(true);
    setStatus("");

    try {
      // --- Save profile (upsert on unique (player_id, alliance_code)) ---
      const profilePayload: any = {
        player_id: props.playerId,
        alliance_code: allianceCode,
        game_name: gameName.trim() || null,
        troop_type: troopType || null,
        troop_tier: troopTier || null,
        march_size_no_heroes: toIntOrNull(marchSize),
        rally_size: toIntOrNull(rallySize),
        updated_at: new Date().toISOString(),
      };

      const up = await supabase
        .from("player_alliance_profiles")
        .upsert(profilePayload, { onConflict: "player_id,alliance_code" })
        .select("id")
        .maybeSingle();

      if (up.error) throw up.error;
      const newProfileId = (up.data as any)?.id ?? profileId ?? null;
      setProfileId(newProfileId);

      // --- Save HQs (upsert by id) ---
      const hqPayloads = (hqs || []).map((h) => ({
        id: h.id,
        user_id: props.userId,
        alliance_id: allianceCode,
        profile_id: newProfileId,
        hq_name: h.hq_name.trim() || null,
        hq_level: toIntOrNull(h.hq_level),
        coord_x: toIntOrNull(h.coord_x),
        coord_y: toIntOrNull(h.coord_y),
        troop_type: h.troop_type || null,
        troop_tier: h.troop_tier || null,
        march_size_no_heroes: toIntOrNull(h.march_size_no_heroes),
        rally_size: toIntOrNull(h.rally_size),
        updated_at: new Date().toISOString(),
      }));

      if (hqPayloads.length > 0) {
        const hqUp = await supabase.from("player_hqs").upsert(hqPayloads, { onConflict: "id" });
        if (hqUp.error) throw hqUp.error;
      }

      // --- Delete removed HQs ---
      const currentIds = new Set((hqs || []).map((x) => x.id));
      const deleted = (initialHqIds || []).filter((id) => !currentIds.has(id));
      if (deleted.length > 0) {
        const del = await supabase.from("player_hqs").delete().in("id", deleted);
        if (del.error) throw del.error;
      }

      setStatus("✅ Saved");
      await load();
    } catch (e: any) {
      console.error(e);
      setStatus(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900 }}>🧾 Your Profile ({allianceCode})</div>
          <div style={{ opacity: 0.75, fontSize: 12 }}>
            Role: {shortRole(props.role)} {isManager ? "(Manager)" : "(Player)"}
          </div>
        </div>
        <button onClick={saveAll} disabled={loading || saving} style={{ padding: "8px 12px", borderRadius: 10 }}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {status ? (
        <div style={{ marginTop: 10, fontSize: 12, opacity: status.startsWith("✅") ? 0.9 : 1, color: status.startsWith("✅") ? "inherit" : "salmon" }}>
          {status}
        </div>
      ) : null}

      {loading ? <div style={{ marginTop: 12, opacity: 0.75 }}>Loading…</div> : null}

      <div style={{ marginTop: 12, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ opacity: 0.8 }}>Game Name</span>
          <input value={gameName} onChange={(e) => setGameName(e.target.value)} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ opacity: 0.8 }}>Troop Type</span>
          <select value={troopType} onChange={(e) => setTroopType(e.target.value as any)}>
            <option value="">—</option>
            <option value="Shooter">Shooter</option>
            <option value="Rider">Rider</option>
            <option value="Fighter">Fighter</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ opacity: 0.8 }}>Troop Tier</span>
          <select value={troopTier} onChange={(e) => setTroopTier(e.target.value as any)}>
            <option value="">—</option>
            <option value="T5">T5</option><option value="T6">T6</option><option value="T7">T7</option>
            <option value="T8">T8</option><option value="T9">T9</option><option value="T10">T10</option>
            <option value="T11">T11</option><option value="T12">T12</option><option value="T13">T13</option>
            <option value="T14">T14</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ opacity: 0.8 }}>March Size (no heroes)</span>
          <input inputMode="numeric" value={marchSize} onChange={(e) => setMarchSize(e.target.value)} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ opacity: 0.8 }}>Rally Size</span>
          <input inputMode="numeric" value={rallySize} onChange={(e) => setRallySize(e.target.value)} />
        </label>
      </div>

      <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900 }}>🏰 Your HQs (Unlimited)</div>
          <button onClick={addHq} disabled={loading || saving} style={{ padding: "8px 12px", borderRadius: 10 }}>
            + Add HQ
          </button>
        </div>

        {hqs.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>No HQs yet. Click “Add HQ”.</div>
        ) : (
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {hqs.map((h) => (
              <div key={h.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontWeight: 800, opacity: 0.9 }}>HQ</div>
                  <button onClick={() => removeHq(h.id)} style={{ padding: "6px 10px", borderRadius: 10 }}>
                    Remove
                  </button>
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ opacity: 0.8 }}>HQ Name</span>
                    <input value={h.hq_name} onChange={(e) => updateHq(h.id, { hq_name: e.target.value })} />
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ opacity: 0.8 }}>HQ Level</span>
                    <input inputMode="numeric" value={h.hq_level} onChange={(e) => updateHq(h.id, { hq_level: e.target.value })} />
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ opacity: 0.8 }}>X</span>
                    <input inputMode="numeric" value={h.coord_x} onChange={(e) => updateHq(h.id, { coord_x: e.target.value })} />
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ opacity: 0.8 }}>Y</span>
                    <input inputMode="numeric" value={h.coord_y} onChange={(e) => updateHq(h.id, { coord_y: e.target.value })} />
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ opacity: 0.8 }}>Troop Type</span>
                    <select value={h.troop_type} onChange={(e) => updateHq(h.id, { troop_type: e.target.value as any })}>
                      <option value="">—</option>
                      <option value="Shooter">Shooter</option>
                      <option value="Rider">Rider</option>
                      <option value="Fighter">Fighter</option>
                    </select>
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ opacity: 0.8 }}>Troop Tier</span>
                    <select value={h.troop_tier} onChange={(e) => updateHq(h.id, { troop_tier: e.target.value as any })}>
                      <option value="">—</option>
                      <option value="T5">T5</option><option value="T6">T6</option><option value="T7">T7</option>
                      <option value="T8">T8</option><option value="T9">T9</option><option value="T10">T10</option>
                      <option value="T11">T11</option><option value="T12">T12</option><option value="T13">T13</option>
                      <option value="T14">T14</option>
                    </select>
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ opacity: 0.8 }}>March Size (no heroes)</span>
                    <input inputMode="numeric" value={h.march_size_no_heroes} onChange={(e) => updateHq(h.id, { march_size_no_heroes: e.target.value })} />
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ opacity: 0.8 }}>Rally Size</span>
                    <input inputMode="numeric" value={h.rally_size} onChange={(e) => updateHq(h.id, { rally_size: e.target.value })} />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
        Data saves to Supabase and persists on refresh.
      </div>
    </div>
  );
}
