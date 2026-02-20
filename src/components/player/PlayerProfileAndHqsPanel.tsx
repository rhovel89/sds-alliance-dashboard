import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
type AnyRow = Record<string, any>;

function upperCode(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

const TROOP_TYPES = ["Shooter", "Rider", "Fighter"] as const;
const TROOP_TIERS = ["T5","T6","T7","T8","T9","T10","T11","T12","T13","T14"] as const;

function isColumnMissingMsg(msg: string, col: string) {
  const m = (msg || "").toLowerCase();
  const c = (col || "").toLowerCase();
  return m.includes("does not exist") && m.includes(c);
}

async function tryInsertPlayerHq(payloads: AnyRow[]) {
  let lastErr: any = null;
  for (const p of payloads) {
    const res = await supabase.from("player_hqs").insert(p).select("*").maybeSingle();
    if (!res.error) return res.data;
    lastErr = res.error;
    const em = String(res.error.message || "");
    // If we hit missing-column errors, try next payload variant
    if (
      isColumnMissingMsg(em, "coord_x") ||
      isColumnMissingMsg(em, "coord_y") ||
      isColumnMissingMsg(em, "hq_name") ||
      isColumnMissingMsg(em, "hq_level") ||
      isColumnMissingMsg(em, "profile_id")
    ) {
      continue;
    }
    break;
  }
  throw lastErr;
}

export default function PlayerProfileAndHqsPanel(props: { allianceCode?: string }) {
  const params = useParams();
  const allianceCode = useMemo(() => {
    const raw =
      props.allianceCode ??
      (params as any)?.allianceCode ??
      (params as any)?.code ??
      (params as any)?.alliance ??
      (params as any)?.tag ??
      "";
    return upperCode(raw);
  }, [props.allianceCode, params]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

  const [profile, setProfile] = useState<AnyRow | null>(null);
  const [hqs, setHqs] = useState<AnyRow[]>([]);

  // editable fields (profile)
  const [gameName, setGameName] = useState("");
  const [hqLevel, setHqLevel] = useState<number | "">("");
  const [troopType, setTroopType] = useState<string>("Shooter");
  const [troopTier, setTroopTier] = useState<string>("T10");
  const [marchSize, setMarchSize] = useState<number | "">("");
  const [rallySize, setRallySize] = useState<number | "">("");

  // add HQ fields
  const [newHqName, setNewHqName] = useState("");
  const [newHqLevel, setNewHqLevel] = useState<number | "">("");
  const [newX, setNewX] = useState<number | "">("");
  const [newY, setNewY] = useState<number | "">("");

  const dashboardBase = useMemo(() => {
    if (!allianceCode) return "";
    return `/dashboard/${encodeURIComponent(allianceCode)}`;
  }, [allianceCode]);

  const loadAll = async () => {
    setErr(null);
    setLoading(true);

    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id ?? null;
      setUserId(uid);

      if (!uid) {
        setPlayerId(null);
        setProfile(null);
        setHqs([]);
        return;
      }

      // find player row
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

      // fetch profile for this alliance
      const { data: prof, error: profErr } = await supabase
        .from("player_alliance_profiles")
        .select("*")
        .eq("player_id", pid)
        .eq("alliance_code", allianceCode)
        .maybeSingle();

      if (profErr) throw profErr;

      setProfile((prof as any) ?? null);

      // hydrate form fields
      const pr: any = prof ?? {};
      setGameName(String(pr.game_name ?? pr.gamename ?? pr.player_name ?? ""));
      setHqLevel(typeof pr.hq_level === "number" ? pr.hq_level : (pr.hq_level ? Number(pr.hq_level) : ""));
      setTroopType(String(pr.troop_type ?? pr.troopType ?? "Shooter"));
      setTroopTier(String(pr.troop_tier ?? pr.troopTier ?? "T10"));
      setMarchSize(typeof pr.march_size === "number" ? pr.march_size : (pr.march_size ? Number(pr.march_size) : ""));
      setRallySize(typeof pr.rally_size === "number" ? pr.rally_size : (pr.rally_size ? Number(pr.rally_size) : ""));

      // fetch HQs (best-effort)
      if ((prof as any)?.id) {
        const { data: rows, error: hqErr } = await supabase
          .from("player_hqs")
          .select("*")
          .eq("profile_id", (prof as any).id)
          .order("created_at", { ascending: true });

        if (!hqErr) setHqs((rows as any[]) ?? []);
        else setHqs([]);
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
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allianceCode]);

  const saveProfile = async () => {
    if (!playerId || !allianceCode) return;
    setErr(null);
    setSaving(true);

    try {
      const payload: AnyRow = {
        player_id: playerId,
        alliance_code: allianceCode,
        game_name: gameName.trim() || null,
        hq_level: hqLevel === "" ? null : Number(hqLevel),
        troop_type: troopType || null,
        troop_tier: troopTier || null,
        march_size: marchSize === "" ? null : Number(marchSize),
        rally_size: rallySize === "" ? null : Number(rallySize),
      };

      const { data, error } = await supabase
        .from("player_alliance_profiles")
        .upsert(payload, { onConflict: "player_id,alliance_code" })
        .select("*")
        .maybeSingle();

      if (error) throw error;

      setProfile((data as any) ?? null);

      // refresh HQs after profile exists
      await loadAll();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const addHq = async () => {
    if (!profile?.id) return alert("Save your profile first (so we have a profile id).");

    const hqName = newHqName.trim();
    if (!hqName) return alert("HQ Name is required.");

    const x = newX === "" ? null : Number(newX);
    const y = newY === "" ? null : Number(newY);
    const lvl = newHqLevel === "" ? null : Number(newHqLevel);

    setErr(null);
    setSaving(true);

    try {
      // Try a few column-name variants safely (in case your table differs)
      const payloads: AnyRow[] = [
        { profile_id: profile.id, alliance_code: allianceCode, hq_name: hqName, hq_level: lvl, coord_x: x, coord_y: y },
        { profile_id: profile.id, alliance_code: allianceCode, name: hqName, level: lvl, x, y },
        { profile_id: profile.id, alliance_code: allianceCode, hq_label: hqName, coord_x: x, coord_y: y },
      ];

      await tryInsertPlayerHq(payloads);

      setNewHqName("");
      setNewHqLevel("");
      setNewX("");
      setNewY("");
      await loadAll();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const deleteHq = async (row: AnyRow) => {
    if (!row?.id) return;
    if (!confirm("Delete this HQ?")) return;

    setErr(null);
    setSaving(true);
    try {
      const { error } = await supabase.from("player_hqs").delete().eq("id", row.id);
      if (error) throw error;
      await loadAll();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const hqDisplay = (row: AnyRow) => {
    const name = String(row?.hq_name ?? row?.name ?? row?.hq_label ?? row?.label ?? "HQ");
    const lvl = row?.hq_level ?? row?.level ?? row?.hqLevel ?? null;
    const x = row?.coord_x ?? row?.x ?? row?.player_x ?? row?.coordX ?? null;
    const y = row?.coord_y ?? row?.y ?? row?.player_y ?? row?.coordY ?? null;
    const coord = (x != null && y != null) ? ` (${x}, ${y})` : "";
    const lvlStr = (lvl != null && String(lvl).length) ? ` • L${lvl}` : "";
    return `${name}${lvlStr}${coord}`;
  };

  if (!allianceCode) return null;

  return (
    <div style={{ marginTop: 16, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 900 }}>👤 My Profile & HQs</div>
          <div style={{ opacity: 0.75, fontSize: 12 }}>Alliance: <b>{allianceCode}</b></div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link to={`${dashboardBase}/hq-map?view=1`} style={{ opacity: 0.9 }}>HQ Map (view)</Link>
          <span style={{ opacity: 0.4 }}>•</span>
          <Link to={`${dashboardBase}/calendar?view=1`} style={{ opacity: 0.9 }}>Calendar (view)</Link>
          <Link to={`${dashboardBase}/guides?view=1`} style={{ opacity: 0.9 }}>Guides (view)</Link>
        </div>
      </div>

      {err ? (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 10, border: "1px solid rgba(255,0,0,0.35)" }}>
          <b>Error:</b> {err}
        </div>
      ) : null}

      {loading ? (
        <div style={{ marginTop: 10, opacity: 0.8 }}>Loading…</div>
      ) : !userId ? (
        <div style={{ marginTop: 10, opacity: 0.85 }}>
          You’re not signed in.
        </div>
      ) : !playerId ? (
        <div style={{ marginTop: 10, opacity: 0.9 }}>
          No <code>players</code> record found for your account yet. If you just joined, complete onboarding or ask an Owner to add you.
        </div>
      ) : (
        <>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Game Name</span>
              <input value={gameName} onChange={(e) => setGameName(e.target.value)} placeholder="Your in-game name" />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>HQ Level</span>
              <input type="number" value={hqLevel} onChange={(e) => setHqLevel(e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g. 30" />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Troop Type</span>
              <select value={troopType} onChange={(e) => setTroopType(e.target.value)}>
                {TROOP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Troop Tier</span>
              <select value={troopTier} onChange={(e) => setTroopTier(e.target.value)}>
                {TROOP_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>March Size (no heroes)</span>
              <input type="number" value={marchSize} onChange={(e) => setMarchSize(e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g. 250000" />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Rally Size</span>
              <input type="number" value={rallySize} onChange={(e) => setRallySize(e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g. 1000000" />
            </label>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={saveProfile} disabled={saving} style={{ padding: "8px 12px", borderRadius: 10 }}>
              {saving ? "Saving…" : "💾 Save Profile"}
            </button>
          </div>

          <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>🏰 My HQs</div>

            {hqs.length === 0 ? (
              <div style={{ opacity: 0.75, marginBottom: 10 }}>No HQs yet. Add one below.</div>
            ) : (
              <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                {hqs.map((row) => (
                  <div key={String(row.id)} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)" }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {hqDisplay(row)}
                    </div>
                    <button onClick={() => deleteHq(row)} disabled={saving} style={{ padding: "6px 10px", borderRadius: 10 }}>
                      🗑 Delete
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span>HQ Name</span>
                <input value={newHqName} onChange={(e) => setNewHqName(e.target.value)} placeholder="Main HQ / Farm / Alt…" />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span>HQ Level</span>
                <input type="number" value={newHqLevel} onChange={(e) => setNewHqLevel(e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g. 30" />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span>X</span>
                <input type="number" value={newX} onChange={(e) => setNewX(e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g. 512" />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span>Y</span>
                <input type="number" value={newY} onChange={(e) => setNewY(e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g. 813" />
              </label>
            </div>

            <div style={{ marginTop: 10 }}>
              <button onClick={addHq} disabled={saving} style={{ padding: "8px 12px", borderRadius: 10 }}>
                ➕ Add HQ
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
