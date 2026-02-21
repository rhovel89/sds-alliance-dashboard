import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type AchType = {
  id: string;
  state_code: string;
  name: string;
  kind: "generic" | "swp_weapon" | "governor_count";
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

type RequestRow = {
  id: string;
  player_name: string;
  alliance_name: string;
  status: string;
  current_count: number;
  required_count: number;
  completed_at: string | null;
  created_at: string;

  state_achievement_types?: { name: string; kind: string; required_count: number } | null;
  state_achievement_options?: { label: string } | null;
};

export default function State789AchievementsPage() {
  const STATE = "789";

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [types, setTypes] = useState<AchType[]>([]);
  const [options, setOptions] = useState<AchOption[]>([]);

  const [playerName, setPlayerName] = useState("");
  const [allianceName, setAllianceName] = useState("");
  const [typeId, setTypeId] = useState<string>("");
  const [optionId, setOptionId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const selectedType = useMemo(() => types.find((t) => t.id === typeId) || null, [types, typeId]);

  const [myReqs, setMyReqs] = useState<RequestRow[]>([]);

  async function loadTypes() {
    const r = await supabase
      .from("state_achievement_types")
      .select("id,state_code,name,kind,requires_option,required_count,active")
      .eq("state_code", STATE)
      .eq("active", true)
      .order("name", { ascending: true });

    if (r.error) throw new Error(r.error.message);
    setTypes((r.data as any) || []);
  }

  async function loadOptions(type_id: string) {
    if (!type_id) { setOptions([]); return; }
    const r = await supabase
      .from("state_achievement_options")
      .select("id,achievement_type_id,label,sort,active")
      .eq("achievement_type_id", type_id)
      .eq("active", true)
      .order("sort", { ascending: true })
      .order("label", { ascending: true });

    if (r.error) throw new Error(r.error.message);
    setOptions((r.data as any) || []);
  }

  async function loadMyRequests() {
    const u = (await supabase.auth.getUser()).data.user;
    if (!u?.id) { setMyReqs([]); return; }

    const r = await supabase
      .from("state_achievement_requests")
      .select(`
        id,player_name,alliance_name,status,current_count,required_count,completed_at,created_at,
        state_achievement_types(name,kind,required_count),
        state_achievement_options(label)
      `)
      .eq("state_code", STATE)
      .eq("created_by", u.id)
      .order("created_at", { ascending: false });

    if (r.error) throw new Error(r.error.message);
    setMyReqs((r.data as any) || []);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setMsg(null);
        await loadTypes();
        if (!cancelled) await loadMyRequests();
      } catch (e: any) {
        if (!cancelled) setMsg("Load failed: " + String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await loadOptions(typeId);
        setOptionId("");
      } catch (e: any) {
        setMsg("Options load failed: " + String(e?.message || e));
      }
    })();
  }, [typeId]);

  async function submit() {
    setMsg(null);

    const u = (await supabase.auth.getUser()).data.user;
    if (!u?.id) return setMsg("Please log in first.");

    if (!playerName.trim()) return setMsg("Name is required.");
    if (!allianceName.trim()) return setMsg("Alliance name is required.");
    if (!typeId) return setMsg("Achievement is required.");
    if (selectedType?.requires_option && !optionId) return setMsg("Please select a weapon.");

    const payload: any = {
      state_code: STATE,
      player_name: playerName.trim(),
      alliance_name: allianceName.trim(),
      achievement_type_id: typeId,
      option_id: selectedType?.requires_option ? optionId : null,
      status: "submitted",
      current_count: 0,
      required_count: selectedType?.required_count ?? 1,
      notes: notes.trim() ? notes.trim() : null,
    };

    const r = await supabase.from("state_achievement_requests").insert(payload).select("id").maybeSingle();
    if (r.error) return setMsg("Submit failed: " + r.error.message);

    setMsg("✅ Submitted.");
    setNotes("");
    await loadMyRequests();
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🏆 State 789 — Achievements</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={loadMyRequests}>Refresh</button>
          <SupportBundleButton />
        </div>
      </div>

      {msg ? (
        <div className="zombie-card" style={{ marginTop: 12, border: "1px solid rgba(255,80,80,0.35)" }}>
          <div style={{ fontWeight: 900 }}>Message</div>
          <div style={{ opacity: 0.85, marginTop: 6 }}>{msg}</div>
        </div>
      ) : null}

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 1fr)", gap: 12 }}>
        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>Request / Track an Achievement</div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Name</div>
            <input className="zombie-input" value={playerName} onChange={(e) => setPlayerName(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} />
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Alliance Name</div>
            <input className="zombie-input" value={allianceName} onChange={(e) => setAllianceName(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} />
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Achievement</div>
            <select className="zombie-input" value={typeId} onChange={(e) => setTypeId(e.target.value)} style={{ width: "100%", padding: "10px 12px" }}>
              <option value="">(select)</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.kind === "governor_count" ? ` (needs ${t.required_count})` : ""}
                </option>
              ))}
            </select>
          </div>

          {selectedType?.requires_option ? (
            <div style={{ marginTop: 10 }}>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Weapon (SWP)</div>
              <select className="zombie-input" value={optionId} onChange={(e) => setOptionId(e.target.value)} style={{ width: "100%", padding: "10px 12px" }}>
                <option value="">(select)</option>
                {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
          ) : null}

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Notes (optional)</div>
            <textarea className="zombie-input" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: "100%", minHeight: 90, padding: "10px 12px" }} />
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={submit} disabled={loading}>Submit</button>
          </div>
        </div>

        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>My Requests</div>
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {myReqs.map((r) => {
              const t = r.state_achievement_types?.name || "Achievement";
              const opt = r.state_achievement_options?.label ? (" — " + r.state_achievement_options.label) : "";
              const needsCount = (r.required_count || 1) > 1;
              const prog = needsCount ? ` (${r.current_count}/${r.required_count})` : "";
              const done = r.status === "completed" ? " ✅" : "";
              return (
                <div key={r.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                  <div style={{ fontWeight: 900 }}>{t}{opt}{prog}{done}</div>
                  <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>Status: {r.status} • Created: {r.created_at}</div>
                  {r.completed_at ? <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>Completed: {r.completed_at}</div> : null}
                </div>
              );
            })}
            {myReqs.length === 0 ? <div style={{ opacity: 0.75 }}>No requests yet.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}