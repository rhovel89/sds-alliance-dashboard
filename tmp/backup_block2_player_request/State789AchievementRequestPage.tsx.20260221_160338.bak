import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type SatType = {
  id: string;
  state_code: string;
  name: string;
  kind: string | null;
  requires_option: boolean | null;
  required_count: number | null;
  active: boolean | null;
};

type SatOption = {
  id: string;
  state_code: string;
  achievement_type_id: string;
  label: string;
  active: boolean | null;
};

type RequestRow = {
  id: string;
  state_code: string;
  player_name: string;
  alliance_name: string;
  achievement_type_id: string;
  option_id: string | null;
  status: string;
  current_count: number | null;
  required_count: number | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string | null;
};

const STATE = "789";

function norm(s: any) { return String(s || "").trim(); }
function nowIso() { return new Date().toISOString(); }

async function getUserId(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

export default function State789AchievementRequestPage() {
  const [types, setTypes] = useState<SatType[]>([]);
  const [options, setOptions] = useState<SatOption[]>([]);
  const [myRequests, setMyRequests] = useState<RequestRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [playerName, setPlayerName] = useState("");
  const [allianceName, setAllianceName] = useState("");
  const [typeId, setTypeId] = useState<string>("");
  const [optionId, setOptionId] = useState<string>("");

  const selectedType = useMemo(() => types.find((t) => t.id === typeId) || null, [types, typeId]);
  const requiresOption = !!selectedType?.requires_option;

  async function loadTypes() {
    setErr(null);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("state_achievement_types")
        .select("id,state_code,name,kind,requires_option,required_count,active")
        .eq("state_code", STATE)
        .eq("active", true)
        .order("name", { ascending: true });

      if (error) throw new Error(error.message);
      const rows = (data || []) as SatType[];
      setTypes(rows);
      if (!typeId) setTypeId(rows[0]?.id || "");
    } catch (e: any) {
      setErr("Load types failed: " + (e?.message || String(e)));
      setTypes([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadOptionsFor(tid: string) {
    setErr(null);
    if (!tid) { setOptions([]); return; }
    try {
      const { data, error } = await supabase
        .from("state_achievement_options")
        .select("id,state_code,achievement_type_id,label,active")
        .eq("state_code", STATE)
        .eq("achievement_type_id", tid)
        .eq("active", true)
        .order("label", { ascending: true });

      if (error) throw new Error(error.message);
      const rows = (data || []) as SatOption[];
      setOptions(rows);
      setOptionId(rows[0]?.id || "");
    } catch (e: any) {
      setErr("Load options failed: " + (e?.message || String(e)));
      setOptions([]);
      setOptionId("");
    }
  }

  async function loadMyRequests() {
    setErr(null);
    try {
      const uid = await getUserId();

      // Preferred: filter by requester_user_id if column exists.
      const selectCols = "id,state_code,player_name,alliance_name,achievement_type_id,option_id,status,current_count,required_count,completed_at,notes,created_at";
      if (uid) {
        const r1 = await supabase
          .from("state_achievement_requests")
          .select(selectCols)
          .eq("state_code", STATE)
          .eq("requester_user_id" as any, uid as any)
          .order("created_at", { ascending: false });

        if (!r1.error) {
          setMyRequests((r1.data || []) as RequestRow[]);
          return;
        }

        // If requester_user_id doesn't exist, retry without it (RLS should still restrict if present).
        const msg = r1.error.message || "";
        if (msg.toLowerCase().includes("requester_user_id") && msg.toLowerCase().includes("does not exist")) {
          const r2 = await supabase
            .from("state_achievement_requests")
            .select(selectCols)
            .eq("state_code", STATE)
            .order("created_at", { ascending: false });

          if (r2.error) throw new Error(r2.error.message);
          setMyRequests((r2.data || []) as RequestRow[]);
          return;
        }

        throw new Error(r1.error.message);
      }

      // No uid: just try (may work if anon allowed or session missing)
      const r3 = await supabase
        .from("state_achievement_requests")
        .select(selectCols)
        .eq("state_code", STATE)
        .order("created_at", { ascending: false });

      if (r3.error) throw new Error(r3.error.message);
      setMyRequests((r3.data || []) as RequestRow[]);
    } catch (e: any) {
      setErr("My requests load failed: " + (e?.message || String(e)));
      setMyRequests([]);
    }
  }

  useEffect(() => { loadTypes(); }, []);
  useEffect(() => { loadOptionsFor(typeId); }, [typeId]);
  useEffect(() => { loadMyRequests(); }, []);

  async function submitRequest() {
    setErr(null);
    setInfo(null);

    const pn = norm(playerName);
    const an = norm(allianceName);
    if (!pn) return alert("Name is required.");
    if (!an) return alert("Alliance name is required.");
    if (!typeId) return alert("Achievement is required.");
    if (requiresOption && !optionId) return alert("Weapon/Option is required for this achievement.");

    const required = Math.max(1, Number(selectedType?.required_count ?? 1));
    const payloadBase: any = {
      state_code: STATE,
      player_name: pn,
      alliance_name: an,
      achievement_type_id: typeId,
      option_id: requiresOption ? optionId : null,
      status: "pending",
      current_count: 0,
      required_count: required,
      notes: null,
    };

    setLoading(true);
    try {
      const uid = await getUserId();

      // Try insert WITH requester_user_id if available; fallback if column missing.
      let ins = await supabase.from("state_achievement_requests").insert({
        ...payloadBase,
        ...(uid ? { requester_user_id: uid } : {}),
      });

      if (ins.error) {
        const msg = ins.error.message || "";
        if (msg.toLowerCase().includes("requester_user_id") && msg.toLowerCase().includes("does not exist")) {
          ins = await supabase.from("state_achievement_requests").insert(payloadBase);
        }
      }

      if (ins.error) throw new Error(ins.error.message);

      setInfo("✅ Submitted. Owner team will review.");
      setPlayerName("");
      setAllianceName("");
      await loadMyRequests();
    } catch (e: any) {
      setErr("Submit failed: " + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  function pct(cur: number | null, req: number | null) {
    const c = Number(cur ?? 0);
    const r = Math.max(1, Number(req ?? 1));
    return `${Math.min(c, r)}/${r}`;
  }

  return (
    <div style={{ padding: 14 }}>
      <h2 style={{ margin: 0 }}>🏆 State 789 — Achievement Request</h2>

      {err ? (
        <div className="zombie-card" style={{ marginTop: 12, border: "1px solid rgba(255,120,120,0.35)" }}>
          <div style={{ fontWeight: 900, color: "#ffb3b3" }}>Error</div>
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap", opacity: 0.9 }}>{err}</div>
        </div>
      ) : null}

      {info ? (
        <div className="zombie-card" style={{ marginTop: 12, border: "1px solid rgba(120,255,120,0.35)" }}>
          <div style={{ fontWeight: 900 }}>Status</div>
          <div style={{ marginTop: 6, opacity: 0.9 }}>{info}</div>
        </div>
      ) : null}

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Submit</div>

        <div style={{ marginTop: 10, display: "grid", gap: 10, gridTemplateColumns: "minmax(220px, 1fr) minmax(220px, 1fr)" }}>
          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Name</div>
            <input className="zombie-input" value={playerName} onChange={(e) => setPlayerName(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} />
          </div>
          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Alliance Name</div>
            <input className="zombie-input" value={allianceName} onChange={(e) => setAllianceName(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} />
          </div>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10, gridTemplateColumns: "minmax(220px, 1fr) minmax(220px, 1fr)" }}>
          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Achievement</div>
            <select className="zombie-input" value={typeId} onChange={(e) => setTypeId(e.target.value)} style={{ width: "100%", padding: "10px 12px" }}>
              {types.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <div style={{ opacity: 0.65, fontSize: 12, marginTop: 6 }}>
              Required: {selectedType?.required_count ?? 1} • Option: {requiresOption ? "Yes" : "No"}
            </div>
          </div>

          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Weapon/Option</div>
            <select className="zombie-input" value={optionId} onChange={(e) => setOptionId(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} disabled={!requiresOption}>
              {!requiresOption ? <option value="">(not needed)</option> : null}
              {requiresOption ? options.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              )) : null}
            </select>
            {requiresOption && options.length === 0 ? (
              <div style={{ opacity: 0.65, fontSize: 12, marginTop: 6 }}>
                No options configured yet for this achievement.
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={submitRequest} disabled={loading}>
            Submit
          </button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => { loadTypes(); loadMyRequests(); }} disabled={loading}>
            Reload
          </button>
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>My Requests</div>
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {myRequests.map((r) => (
            <div key={r.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>{r.player_name}</div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>({r.alliance_name})</div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>status={r.status}</div>
                <div style={{ marginLeft: "auto", opacity: 0.75, fontSize: 12 }}>{pct(r.current_count, r.required_count)}</div>
              </div>
              <div style={{ opacity: 0.6, fontSize: 12, marginTop: 6 }}>
                id: {r.id} • created: {r.created_at || nowIso()}
              </div>
            </div>
          ))}
          {myRequests.length === 0 ? <div style={{ opacity: 0.75 }}>No requests found.</div> : null}
        </div>
      </div>
    </div>
  );
}