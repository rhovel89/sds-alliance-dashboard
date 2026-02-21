import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";
import StateAchievementsProgressPanel from "../../components/state/StateAchievementsProgressPanel";

type AnyRow = Record<string, any>;

function nowUtc() { return new Date().toISOString(); }
function norm(s: any) { return String(s || "").trim(); }
function normLower(s: any) { return String(s || "").trim().toLowerCase(); }
function asInt(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

export default function State789AchievementsPage() {
  const stateCode = "789";

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);

  const [types, setTypes] = useState<AnyRow[]>([]);
  const [options, setOptions] = useState<AnyRow[]>([]);
  const [requests, setRequests] = useState<AnyRow[]>([]);

  // Form fields
  const [playerName, setPlayerName] = useState("");
  const [allianceName, setAllianceName] = useState("");
  const [typeId, setTypeId] = useState<string>("");
  const [optionId, setOptionId] = useState<string>("");

  const typeById = useMemo(() => {
    const m: Record<string, AnyRow> = {};
    for (const t of types) if (t?.id) m[String(t.id)] = t;
    return m;
  }, [types]);

  const selectedType = useMemo(() => (typeId ? typeById[String(typeId)] : null), [typeId, typeById]);

  const filteredOptions = useMemo(() => {
    if (!typeId) return [];
    const tid = String(typeId);
    return (options || []).filter((o) => String(o.achievement_type_id) === tid && (o.active === true || o.active === null || typeof o.active === "undefined"));
  }, [options, typeId]);

  async function loadAll() {
    setLoading(true);
    setMsg(null);

    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id || null;
    setUserId(uid);

    const t = await supabase
      .from("state_achievement_types")
      .select("*")
      .eq("state_code", stateCode)
      .eq("active", true)
      .order("name", { ascending: true });

    if (t.error) {
      setTypes([]); setOptions([]); setRequests([]);
      setMsg("Types load failed: " + t.error.message);
      setLoading(false);
      return;
    }

    const tData = (t.data as any[]) || [];
    setTypes(tData);

    // options for all types
    const ids = tData.map((x) => x?.id).filter(Boolean);
    if (ids.length) {
      const o = await supabase
        .from("state_achievement_options")
        .select("*")
        .in("achievement_type_id", ids)
        .order("sort", { ascending: true })
        .order("label", { ascending: true });

      if (!o.error) setOptions((o.data as any[]) || []);
      else setOptions([]);
    } else {
      setOptions([]);
    }

    // requests visible to this user (RLS should filter; we DO NOT assume requester_user_id)
    const r = await supabase
      .from("state_achievement_requests")
      .select("*")
      .eq("state_code", stateCode)
      .order("created_at", { ascending: false });

    if (r.error) {
      setRequests([]);
      setMsg((prev) => (prev ? prev + " | " : "") + "My requests load failed: " + r.error.message);
      setLoading(false);
      return;
    }

    setRequests((r.data as any[]) || []);
    setLoading(false);

    // default type selection
    if (!typeId && tData.length) {
      const first = tData[0];
      if (first?.id) setTypeId(String(first.id));
    }
  }

  useEffect(() => { loadAll(); }, []);

  // keep optionId valid when type changes
  useEffect(() => {
    if (!selectedType) return;
    const requiresOption = selectedType.requires_option === true;
    if (!requiresOption) {
      if (optionId) setOptionId("");
      return;
    }
    // requires option: pick first if current not in list
    if (!filteredOptions.length) {
      if (optionId) setOptionId("");
      return;
    }
    const ok = filteredOptions.some((o) => String(o.id) === String(optionId));
    if (!ok) setOptionId(String(filteredOptions[0].id));
  }, [selectedType, filteredOptions, optionId]);

  async function submit() {
    setMsg(null);

    const pn = norm(playerName);
    const an = norm(allianceName);
    if (!pn) return setMsg("Name is required.");
    if (!an) return setMsg("Alliance name is required.");
    if (!typeId) return setMsg("Select an achievement.");

    const t = selectedType;
    if (!t) return setMsg("Selected achievement is missing (reload).");

    const requiresOption = t.requires_option === true;
    const opt = requiresOption ? norm(optionId) : "";
    if (requiresOption && !opt) return setMsg("Select a weapon/option.");

    const reqCount = Math.max(1, asInt(t.required_count, 1));

    // minimal stable insert payload
    const payload: AnyRow = {
      state_code: stateCode,
      player_name: pn,
      alliance_name: an,
      achievement_type_id: String(typeId),
      option_id: requiresOption ? String(optionId) : null,
      status: "submitted",
      current_count: 0,
      required_count: reqCount,
      notes: null
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

    setMsg("✅ Submitted!");
    setPlayerName("");
    setAllianceName("");
    await loadAll();
  }

  const typeName = (id: any) => {
    const t = id ? typeById[String(id)] : null;
    return String(t?.name || "Achievement");
  };

  const optionLabel = (id: any) => {
    if (!id) return "";
    const o = (options || []).find((x) => String(x.id) === String(id));
    return o ? String(o.label || "") : "";
  };

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🏆 State 789 — Achievements</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => window.location.assign("/state/789")}>Back to State</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={loadAll}>Refresh</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ opacity: 0.75, fontSize: 12 }}>
          {loading ? "Loading…" : `Loaded types: ${types.length} • options: ${options.length} • requests visible: ${requests.length}`}
        </div>
        {msg ? <div style={{ marginTop: 10, opacity: 0.9 }}>{msg}</div> : null}
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Request an Achievement</div>

        <div style={{ marginTop: 10, display: "grid", gap: 10, maxWidth: 720 }}>
          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Name</div>
            <input className="zombie-input" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Your in-game name" style={{ padding: "10px 12px", width: "100%" }} />
          </div>

          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Alliance Name</div>
            <input className="zombie-input" value={allianceName} onChange={(e) => setAllianceName(e.target.value)} placeholder="Alliance name" style={{ padding: "10px 12px", width: "100%" }} />
          </div>

          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Achievement</div>
            <select className="zombie-input" value={typeId} onChange={(e) => setTypeId(e.target.value)} style={{ padding: "10px 12px", width: "100%" }}>
              {types.map((t) => (
                <option key={String(t.id)} value={String(t.id)}>
                  {String(t.name || t.id)}
                </option>
              ))}
            </select>
          </div>

          {selectedType?.requires_option === true ? (
            <div>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Weapon / Option</div>
              <select className="zombie-input" value={optionId} onChange={(e) => setOptionId(e.target.value)} style={{ padding: "10px 12px", width: "100%" }}>
                {filteredOptions.map((o) => (
                  <option key={String(o.id)} value={String(o.id)}>
                    {String(o.label || o.id)}
                  </option>
                ))}
              </select>
              <div style={{ opacity: 0.65, fontSize: 12, marginTop: 6 }}>
                Owner can add/edit weapons in Owner → State Achievements → Options.
              </div>
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: 900 }} onClick={submit}>Submit</button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => window.location.assign("/owner/state-achievements")}>
              Owner Queue
            </button>
          </div>

          <div style={{ opacity: 0.65, fontSize: 12 }}>
            After submission, Owner (or approved helpers) will update your progress (ex: Governor Rotations 2/3).
          </div>
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>My Visible Requests</div>
        <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
          Visibility is controlled by Supabase RLS.
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {(requests || []).slice(0, 40).map((r) => {
            const tName = typeName(r.achievement_type_id);
            const oLabel = optionLabel(r.option_id);
            const req = Math.max(1, asInt(r.required_count, asInt(typeById[String(r.achievement_type_id)]?.required_count, 1)));
            const cur = Math.max(0, asInt(r.current_count, 0));
            const done = (String(r.status) === "completed") || (cur >= req);

            return (
              <div key={String(r.id)} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontWeight: 900 }}>
                    {tName}{oLabel ? (" — " + oLabel) : ""}
                  </div>
                  <div style={{ marginLeft: "auto", fontWeight: 900 }}>{cur}/{req}{done ? " ✅" : ""}</div>
                </div>
                <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
                  status: {String(r.status || "submitted")} • created: {String(r.created_at || "—")}
                </div>
              </div>
            );
          })}
          {!loading && (!requests || requests.length === 0) ? <div style={{ opacity: 0.75 }}>No requests yet.</div> : null}
        </div>
      </div>
    </div>
  );
}
