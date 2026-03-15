import React, { useEffect, useMemo, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";
import { supabase } from "../../lib/supabaseClient";

type AnyRow = Record<string, any>;

function norm(v: any) {
  return String(v || "").trim();
}

function asInt(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

export default function State789AchievementRequestPage() {
  const stateCode = "789";

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [types, setTypes] = useState<AnyRow[]>([]);
  const [options, setOptions] = useState<AnyRow[]>([]);
  const [requests, setRequests] = useState<AnyRow[]>([]);

  const [playerName, setPlayerName] = useState("");
  const [allianceName, setAllianceName] = useState("");
  const [typeId, setTypeId] = useState("");
  const [optionId, setOptionId] = useState("");

  const typeById = useMemo(() => {
    const m: Record<string, AnyRow> = {};
    for (const t of types) {
      if (t?.id) m[String(t.id)] = t;
    }
    return m;
  }, [types]);

  const selectedType = useMemo(() => {
    return typeId ? typeById[String(typeId)] : null;
  }, [typeId, typeById]);

  const filteredOptions = useMemo(() => {
    if (!typeId) return [];
    const tid = String(typeId);
    return (options || []).filter(
      (o) =>
        String(o.achievement_type_id) === tid &&
        (o.active === true || o.active === null || typeof o.active === "undefined")
    );
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
      setTypes([]);
      setOptions([]);
      setRequests([]);
      setMsg("Types load failed: " + t.error.message);
      setLoading(false);
      return;
    }

    const tData = (t.data as any[]) || [];
    setTypes(tData);

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

    const r = await supabase
      .from("state_achievement_requests")
      .select("*")
      .eq("state_code", stateCode)
      .order("created_at", { ascending: false })
      .limit(25);

    if (r.error) {
      setRequests([]);
    } else {
      setRequests((r.data as any[]) || []);
    }

    if (!typeId && tData.length && tData[0]?.id) {
      setTypeId(String(tData[0].id));
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (!selectedType) return;

    const requiresOption = selectedType.requires_option === true;

    if (!requiresOption) {
      if (optionId) setOptionId("");
      return;
    }

    if (!filteredOptions.length) {
      if (optionId) setOptionId("");
      return;
    }

    const ok = filteredOptions.some((o) => String(o.id) === String(optionId));
    if (!ok) setOptionId(String(filteredOptions[0].id));
  }, [selectedType, filteredOptions, optionId]);

  async function submit() {
    setMsg(null);

    if (!userId) {
      setMsg("Please sign in first.");
      return;
    }

    const pn = norm(playerName);
    const an = norm(allianceName);

    if (!pn) return setMsg("Name is required.");
    if (!an) return setMsg("Alliance name is required.");
    if (!typeId) return setMsg("Select an achievement.");

    const t = selectedType;
    if (!t) return setMsg("Selected achievement is missing. Reload this page.");

    const requiresOption = t.requires_option === true;
    const opt = requiresOption ? norm(optionId) : "";

    if (requiresOption && !opt) {
      return setMsg("Select a weapon / option.");
    }

    const reqCount = Math.max(1, asInt(t.required_count, 1));

    const payload: AnyRow = {
      state_code: stateCode,
      player_name: pn,
      alliance_name: an,
      achievement_type_id: String(typeId),
      option_id: requiresOption ? String(optionId) : null,
      status: "submitted",
      current_count: 0,
      required_count: reqCount,
      notes: null,
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
    setOptionId("");
    await loadAll();
  }

  function typeName(id: any) {
    const t = id ? typeById[String(id)] : null;
    return String(t?.name || "Achievement");
  }

  function optionLabel(id: any) {
    if (!id) return "";
    const o = (options || []).find((x) => String(x.id) === String(id));
    return o ? String(o.label || "") : "";
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto", display: "grid", gap: 12 }}>
      <div
        className="zombie-card"
        style={{
          padding: 18,
          background: "linear-gradient(180deg, rgba(16,20,26,0.98), rgba(8,10,14,0.94))",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950 }}>🏆 State 789 Achievement Request</h1>
            <div style={{ opacity: 0.82, marginTop: 8, lineHeight: 1.6 }}>
              Submit your achievement request here. Approval and progress tracking stay the same.
            </div>
            <div style={{ opacity: 0.7, marginTop: 8, fontSize: 12 }}>
              {userId ? "Signed in ✅" : "Not signed in"}{msg ? " • " + msg : ""}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" type="button" style={{ padding: "10px 12px" }} onClick={() => window.location.assign("/state/789/achievements")}>
              Achievements
            </button>
            <button className="zombie-btn" type="button" style={{ padding: "10px 12px" }} onClick={() => window.location.assign("/state/789/achievements-tracker")}>
              Tracker
            </button>
            <button className="zombie-btn" type="button" style={{ padding: "10px 12px" }} onClick={() => window.location.assign("/state/789/achievements-progress")}>
              Progress
            </button>
            <SupportBundleButton />
          </div>
        </div>
      </div>

      <div className="zombie-card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Request form</div>
        <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4, marginBottom: 12 }}>
          This page uses the same achievements tables directly and avoids the redirect loop.
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Name</div>
            <input
              className="zombie-input"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Your in-game name"
              style={{ padding: "10px 12px", width: "100%" }}
            />
          </div>

          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Alliance Name</div>
            <input
              className="zombie-input"
              value={allianceName}
              onChange={(e) => setAllianceName(e.target.value)}
              placeholder="Alliance name"
              style={{ padding: "10px 12px", width: "100%" }}
            />
          </div>

          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Achievement</div>
            <select
              className="zombie-input"
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              style={{ padding: "10px 12px", width: "100%" }}
            >
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
              <select
                className="zombie-input"
                value={optionId}
                onChange={(e) => setOptionId(e.target.value)}
                style={{ padding: "10px 12px", width: "100%" }}
              >
                {filteredOptions.map((o) => (
                  <option key={String(o.id)} value={String(o.id)}>
                    {String(o.label || o.id)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="zombie-btn" type="button" style={{ padding: "12px 14px", fontWeight: 900 }} onClick={submit} disabled={!userId}>
              Submit Request
            </button>
          </div>
        </div>
      </div>

      <div className="zombie-card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Recent visible requests</div>
        <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4, marginBottom: 12 }}>
          Visibility is still controlled by Supabase RLS.
        </div>

        {loading ? (
          <div style={{ opacity: 0.75 }}>Loading…</div>
        ) : requests.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No requests visible yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {requests.map((r) => {
              const req = Math.max(1, asInt(r.required_count, 1));
              const cur = Math.max(0, asInt(r.current_count, 0));
              const done = String(r.status || "") === "completed" || cur >= req;

              return (
                <div
                  key={String(r.id)}
                  style={{
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 12,
                    padding: 12,
                    background: done ? "rgba(120,255,120,0.05)" : "rgba(255,255,255,0.03)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900 }}>
                      {typeName(r.achievement_type_id)}{r.option_id ? ` — ${optionLabel(r.option_id)}` : ""}
                    </div>
                    <div style={{ fontWeight: 900 }}>{cur}/{req}{done ? " ✅" : ""}</div>
                  </div>

                  <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
                    {String(r.player_name || "Player")} • {String(r.alliance_name || "—")} • {String(r.status || "submitted")}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
