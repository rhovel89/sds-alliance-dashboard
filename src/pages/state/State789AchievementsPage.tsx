import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type AchType = {
  id: string;
  state_code: string;
  name: string;
  kind: string;
  requires_option: boolean;
  required_count: number;
  active: boolean;
};

type AchOption = {
  id: string;
  achievement_type_id: string;
  label: string;
  sort: number;
  active: boolean;
};

type ReqRow = {
  id: string;
  state_code: string;
  requester_user_id: string;
  player_name: string;
  alliance_name: string;
  achievement_type_id: string;
  option_id: string | null;
  status: string;
  current_count: number;
  required_count: number;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function nowUtc() { return new Date().toISOString(); }
function norm(s: any) { return String(s || "").trim(); }

export default function State789AchievementsPage() {
  const stateCode = "789";

  const [userId, setUserId] = useState<string | null>(null);

  const [types, setTypes] = useState<AchType[]>([]);
  const [options, setOptions] = useState<AchOption[]>([]);
  const [myRequests, setMyRequests] = useState<ReqRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [playerName, setPlayerName] = useState("");
  const [allianceName, setAllianceName] = useState("");
  const [typeId, setTypeId] = useState<string>("");
  const [optionId, setOptionId] = useState<string>("");

  const typeById = useMemo(() => {
    const m: Record<string, AchType> = {};
    for (const t of types) m[t.id] = t;
    return m;
  }, [types]);

  const activeTypes = useMemo(() => {
    return (types || []).filter((t) => t.active !== false);
  }, [types]);

  const optionsForType = useMemo(() => {
    if (!typeId) return [];
    return (options || [])
      .filter((o) => o.achievement_type_id === typeId)
      .filter((o) => o.active !== false)
      .sort((a, b) => (a.sort - b.sort) || a.label.localeCompare(b.label));
  }, [options, typeId]);

  const selectedType = useMemo(() => (typeId ? typeById[typeId] : null), [typeId, typeById]);

  async function loadAll() {
    setLoading(true);
    setMsg(null);

    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id || null;
    setUserId(uid);

    const t = await supabase
      .from("state_achievement_types")
      .select("id,state_code,name,kind,requires_option,required_count,active")
      .eq("state_code", stateCode)
      .eq("active", true)
      .order("name", { ascending: true });

    if (t.error) {
      setTypes([]);
      setOptions([]);
      setMyRequests([]);
      setMsg("Types load failed: " + t.error.message);
      setLoading(false);
      return;
    }

    const typesData = (t.data as any) || [];
    setTypes(typesData);

    const ids = typesData.map((x: any) => x.id).filter(Boolean);
    if (ids.length) {
      const o = await supabase
        .from("state_achievement_options")
        .select("id,achievement_type_id,label,sort,active")
        .in("achievement_type_id", ids)
        .eq("active", true)
        .order("sort", { ascending: true })
        .order("label", { ascending: true });

      if (o.error) {
        setOptions([]);
        setMsg((prev) => (prev ? prev + " | " : "") + "Options load failed: " + o.error.message);
      } else {
        setOptions((o.data as any) || []);
      }
    } else {
      setOptions([]);
    }

    if (uid) {
      const r = await supabase
        .from("state_achievement_requests")
        .select("*")
        .eq("state_code", stateCode)
        .order("created_at", { ascending: false });

      if (r.error) {
        setMyRequests([]);
        setMsg((prev) => (prev ? prev + " | " : "") + "My requests load failed: " + r.error.message);
      } else {
        setMyRequests((r.data as any) || []);
      }
    } else {
      setMyRequests([]);
      setMsg((prev) => (prev ? prev + " | " : "") + "Not logged in.");
    }

    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    // If type changes and it doesn't require option, clear optionId
    if (!selectedType?.requires_option) setOptionId("");
  }, [selectedType?.requires_option]);

  async function submit() {
    setMsg(null);

    const pn = norm(playerName);
    const an = norm(allianceName);
    if (!pn) return setMsg("Name is required.");
    if (!an) return setMsg("Alliance name is required.");
    if (!typeId) return setMsg("Select an achievement.");

    const t = selectedType;
    if (!t) return setMsg("Invalid achievement selection.");

    if (t.requires_option && !optionId) return setMsg("Select a weapon/option.");

    const payload: any = {
      state_code: stateCode,
      player_name: pn,
      alliance_name: an,
      achievement_type_id: typeId,
      option_id: t.requires_option ? optionId : null
      // requester_user_id is set by DB trigger; do not trust client
    };

    const ins = await supabase.from("state_achievement_requests").insert(payload).select("id").maybeSingle();
    if (ins.error) {
      setMsg("Submit failed: " + ins.error.message);
      return;
    }

    setMsg("✅ Submitted. Owner will track progress.");
    setTypeId("");
    setOptionId("");
    await loadAll();
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🏆 State 789 — Achievements</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={loadAll}>Refresh</button>
          <SupportBundleButton />
        </div>
      </div>

      {msg ? (
        <div className="zombie-card" style={{ marginTop: 12, border: "1px solid rgba(255,80,80,0.35)" }}>
          <div style={{ fontWeight: 900 }}>Message</div>
          <div style={{ opacity: 0.85, marginTop: 6 }}>{msg}</div>
        </div>
      ) : null}

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Submit a new Achievement Goal</div>
        <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
          Fill this out to request tracking. Owner/Helpers will update your progress.
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10, maxWidth: 720 }}>
          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Name</div>
            <input className="zombie-input" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Your in-game name" style={{ padding: "10px 12px", width: "100%" }} />
          </div>

          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Alliance name</div>
            <input className="zombie-input" value={allianceName} onChange={(e) => setAllianceName(e.target.value)} placeholder="WOC / SDS / etc" style={{ padding: "10px 12px", width: "100%" }} />
          </div>

          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Achievement</div>
            <select className="zombie-input" value={typeId} onChange={(e) => setTypeId(e.target.value)} style={{ padding: "10px 12px", width: "100%" }}>
              <option value="">Select…</option>
              {activeTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.kind ? ` (${t.kind})` : ""}{t.required_count ? ` — ${t.required_count}x` : ""}
                </option>
              ))}
            </select>
          </div>

          {selectedType?.requires_option ? (
            <div>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Weapon / Option</div>
              <select className="zombie-input" value={optionId} onChange={(e) => setOptionId(e.target.value)} style={{ padding: "10px 12px", width: "100%" }}>
                <option value="">Select…</option>
                {optionsForType.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
              <div style={{ opacity: 0.65, fontSize: 12, marginTop: 6 }}>
                If you don’t see the weapon you want, Owner can add it in Owner → State Achievements.
              </div>
            </div>
          ) : null}

          <button className="zombie-btn" style={{ padding: "12px 14px", fontWeight: 900, width: 220 }} onClick={submit} disabled={loading || !userId}>
            Submit
          </button>
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>My Requests</div>
        <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
          Progress is updated by Owner/Helpers. Completed items auto-mark ✅ when count hits required.
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {myRequests.map((r) => {
            const t = typeById[r.achievement_type_id];
            const o = r.option_id ? (options.find((x) => x.id === r.option_id) || null) : null;
            const req = r.required_count || t?.required_count || 1;
            const cur = r.current_count || 0;
            const done = r.status === "completed" || cur >= req;

            return (
              <div key={r.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontWeight: 900 }}>
                    {(t?.name || "Achievement")}{o ? (" — " + o.label) : ""}
                  </div>
                  <div style={{ marginLeft: "auto", fontWeight: 900 }}>
                    {cur}/{req}{done ? " ✅" : ""}
                  </div>
                </div>
                <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
                  Status: {r.status} • Submitted: {r.created_at}
                </div>
                {r.notes ? (
                  <div style={{ opacity: 0.85, marginTop: 8, whiteSpace: "pre-wrap" }}>
                    Notes: {r.notes}
                  </div>
                ) : null}
              </div>
            );
          })}
          {!loading && myRequests.length === 0 ? <div style={{ opacity: 0.75 }}>No requests yet.</div> : null}
        </div>
      </div>
    </div>
  );
}
