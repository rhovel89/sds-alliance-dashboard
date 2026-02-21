import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type AnyRow = Record<string, any>;

function norm(s: any) { return String(s || "").trim(); }
function normLower(s: any) { return String(s || "").trim().toLowerCase(); }
function asInt(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

type Props = {
  stateCode: string;
};

export function StateAchievementsRequestForm({ stateCode }: Props) {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);

  const [types, setTypes] = useState<AnyRow[]>([]);
  const [options, setOptions] = useState<AnyRow[]>([]);

  const [playerName, setPlayerName] = useState("");
  const [allianceName, setAllianceName] = useState("");

  const [typeId, setTypeId] = useState<string>("");
  const [optionId, setOptionId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [currentCount, setCurrentCount] = useState<number>(0);

  const typeById = useMemo(() => {
    const m: Record<string, AnyRow> = {};
    for (const t of types) if (t?.id) m[String(t.id)] = t;
    return m;
  }, [types]);

  const optionsByType = useMemo(() => {
    const m: Record<string, AnyRow[]> = {};
    for (const o of options || []) {
      const tid = String(o.achievement_type_id || "");
      if (!tid) continue;
      if (!m[tid]) m[tid] = [];
      m[tid].push(o);
    }
    for (const k of Object.keys(m)) {
      m[k].sort((a, b) => {
        const sa = asInt(a.sort, 0), sb = asInt(b.sort, 0);
        if (sa !== sb) return sa - sb;
        return String(a.label || "").localeCompare(String(b.label || ""));
      });
    }
    return m;
  }, [options]);

  const selectedType = useMemo(() => (typeId ? (typeById[typeId] || null) : null), [typeId, typeById]);
  const requiresOption = useMemo(() => selectedType?.requires_option === true, [selectedType]);

  const requiredCount = useMemo(() => Math.max(1, asInt(selectedType?.required_count, 1)), [selectedType]);
  const countChoices = useMemo(() => {
    const n = Math.max(1, requiredCount);
    const arr: number[] = [];
    for (let i = 0; i <= n; i++) arr.push(i);
    return arr;
  }, [requiredCount]);

  async function loadTypesOptions() {
    setLoading(true);
    setMsg(null);

    const u = await supabase.auth.getUser();
    setUserId(u.data.user?.id || null);

    const t = await supabase
      .from("state_achievement_types")
      .select("*")
      .eq("state_code", stateCode)
      .eq("active", true)
      .order("name", { ascending: true });

    if (t.error) {
      setTypes([]);
      setOptions([]);
      setMsg("Types load failed: " + t.error.message);
      setLoading(false);
      return;
    }

    const tData = (t.data as any[]) || [];
    setTypes(tData);

    if (!typeId && tData.length) {
      setTypeId(String(tData[0].id));
    }

    const ids = tData.map((x) => x?.id).filter(Boolean);
    if (ids.length) {
      const op = await supabase
        .from("state_achievement_options")
        .select("*")
        .in("achievement_type_id", ids)
        .eq("active", true)
        .order("sort", { ascending: true })
        .order("label", { ascending: true });

      if (!op.error) setOptions((op.data as any[]) || []);
      else setOptions([]);
    } else {
      setOptions([]);
    }

    setLoading(false);
  }

  useEffect(() => { loadTypesOptions(); }, [stateCode]);

  useEffect(() => {
    // if new selected type doesn't require options, clear optionId
    if (!requiresOption) setOptionId("");
    // reset count to 0 if it exceeds required_count
    setCurrentCount((c) => Math.min(Math.max(0, c), requiredCount));
  }, [typeId, requiresOption, requiredCount]);

  const isSwp = useMemo(() => normLower(selectedType?.name) === "swp weapon", [selectedType]);
  const isGovernor = useMemo(() => normLower(selectedType?.name) === "governor rotations", [selectedType]);

  async function submit() {
    setMsg(null);

    const pName = norm(playerName);
    const aName = norm(allianceName);
    const tid = norm(typeId);

    if (!pName) return setMsg("Name is required.");
    if (!aName) return setMsg("Alliance name is required.");
    if (!tid) return setMsg("Achievement is required.");

    if (requiresOption) {
      const oid = norm(optionId);
      if (!oid) return setMsg("Please select an option (weapon).");
    }

    const payload: AnyRow = {
      state_code: stateCode,
      player_name: pName,
      alliance_name: aName,
      achievement_type_id: tid,
      option_id: requiresOption ? norm(optionId) : null,
      status: "submitted",
      current_count: Math.max(0, Math.min(currentCount, requiredCount)),
      required_count: requiredCount,
      notes: notes ? notes : null
      // requester_user_id is auto-set by trigger (or can be supplied by DB/RLS)
    };

    const ins = await supabase
      .from("state_achievement_requests")
      .insert(payload as any)
      .select("*")
      .maybeSingle();

    if (ins.error) {
      setMsg("Submit failed: " + ins.error.message);
      return;
    }

    setMsg("✅ Submitted. Owner/State staff will track progress.");
    // reset minimal fields but keep player/alliance for convenience
    setNotes("");
    if (isGovernor) setCurrentCount(Math.min(currentCount, requiredCount));
    else setCurrentCount(0);
  }

  return (
    <div className="zombie-card" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 900 }}>📝 Submit Achievement Request</div>
        <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={loadTypesOptions}>
          Refresh Types
        </button>
      </div>

      <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
        {loading ? "Loading types…" : `Types=${types.length} • Options=${options.length} • user=${userId ? "yes" : "no"}`}
      </div>

      {msg ? <div style={{ marginTop: 10, opacity: 0.95 }}>{msg}</div> : null}

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(260px, 1fr) minmax(260px, 1fr)", gap: 12 }}>
        <div>
          <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Name</div>
          <input className="zombie-input" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Your in-game name" style={{ width: "100%", padding: "10px 12px" }} />
        </div>
        <div>
          <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Alliance Name</div>
          <input className="zombie-input" value={allianceName} onChange={(e) => setAllianceName(e.target.value)} placeholder="Alliance name" style={{ width: "100%", padding: "10px 12px" }} />
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(260px, 1fr) minmax(260px, 1fr)", gap: 12 }}>
        <div>
          <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Achievement</div>
          <select className="zombie-input" value={typeId} onChange={(e) => setTypeId(e.target.value)} style={{ width: "100%", padding: "10px 12px" }}>
            {types.map((t) => (
              <option key={String(t.id)} value={String(t.id)}>{String(t.name || t.id)}</option>
            ))}
          </select>
          <div style={{ opacity: 0.65, fontSize: 12, marginTop: 6 }}>
            {isGovernor ? "Governor Rotations: must hold Governor 3 times (tracked 0/3 → 3/3 ✅)." : null}
            {isSwp ? "SWP Weapon: choose the weapon you want/need." : null}
          </div>
        </div>

        <div>
          {requiresOption ? (
            <>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Weapon / Option</div>
              <select className="zombie-input" value={optionId} onChange={(e) => setOptionId(e.target.value)} style={{ width: "100%", padding: "10px 12px" }}>
                <option value="">(select)</option>
                {(optionsByType[typeId] || []).map((o) => (
                  <option key={String(o.id)} value={String(o.id)}>{String(o.label || o.id)}</option>
                ))}
              </select>
              <div style={{ opacity: 0.65, fontSize: 12, marginTop: 6 }}>
                Owner can add more weapons/options in Owner → State Achievements Admin.
              </div>
            </>
          ) : (
            <>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Progress (optional)</div>
              <select className="zombie-input" value={String(currentCount)} onChange={(e) => setCurrentCount(asInt(e.target.value, 0))} style={{ width: "100%", padding: "10px 12px" }}>
                {countChoices.map((n) => (
                  <option key={n} value={String(n)}>{n}/{requiredCount}</option>
                ))}
              </select>
              <div style={{ opacity: 0.65, fontSize: 12, marginTop: 6 }}>
                For Governor Rotations, set your current rotations (0–3). Owner will verify/track.
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Notes (optional)</div>
        <textarea className="zombie-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the owner should know…" style={{ width: "100%", minHeight: 80, padding: "10px 12px" }} />
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: 900 }} onClick={submit} disabled={loading}>
          Submit
        </button>
        <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => window.location.assign("/state/789/achievements-progress")}>
          View Progress
        </button>
      </div>
    </div>
  );
}