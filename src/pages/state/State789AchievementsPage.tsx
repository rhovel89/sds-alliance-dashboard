import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type AchType = {
  id: string;
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
  player_name: string;
  alliance_name: string;
  status: string;
  current_count: number;
  required_count: number;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  state_achievement_types?: { name: string; kind: string; required_count: number } | null;
  state_achievement_options?: { label: string } | null;
};

function nowUtc() { return new Date().toISOString(); }

async function copyText(txt: string) {
  try { await navigator.clipboard.writeText(txt); window.alert("Copied."); }
  catch { window.prompt("Copy:", txt); }
}

export default function State789AchievementsPage() {
  const STATE = "789";
  const [msg, setMsg] = useState<string | null>(null);

  const [types, setTypes] = useState<AchType[]>([]);
  const [typeId, setTypeId] = useState<string>("");
  const type = useMemo(() => types.find((t) => t.id === typeId) || null, [types, typeId]);

  const [options, setOptions] = useState<AchOption[]>([]);
  const [optionId, setOptionId] = useState<string>("");

  const [playerName, setPlayerName] = useState("");
  const [allianceName, setAllianceName] = useState("");
  const [notes, setNotes] = useState("");

  const [myReqs, setMyReqs] = useState<ReqRow[]>([]);

  async function loadTypes() {
    setMsg(null);
    const r = await supabase
      .from("state_achievement_types")
      .select("id,name,kind,requires_option,required_count,active")
      .eq("state_code", STATE)
      .eq("active", true)
      .order("name", { ascending: true });

    if (r.error) { setMsg("Load achievements failed: " + r.error.message); setTypes([]); return; }
    setTypes((r.data as any) || []);
  }

  async function loadOptions(tid: string) {
    setMsg(null);
    if (!tid) { setOptions([]); setOptionId(""); return; }

    const r = await supabase
      .from("state_achievement_options")
      .select("id,achievement_type_id,label,sort,active")
      .eq("achievement_type_id", tid)
      .eq("active", true)
      .order("sort", { ascending: true })
      .order("label", { ascending: true });

    if (r.error) { setMsg("Load options failed: " + r.error.message); setOptions([]); return; }
    setOptions((r.data as any) || []);
  }

  async function loadMyReqs() {
    setMsg(null);
    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id || null;
    if (!uid) { setMyReqs([]); return; }

    const r = await supabase
      .from("state_achievement_requests")
      .select(`
        id,player_name,alliance_name,status,current_count,required_count,completed_at,notes,created_at,
        state_achievement_types(name,kind,required_count),
        state_achievement_options(label)
      `)
      .eq("state_code", STATE)
      .eq("requester_user_id", uid)
      .order("created_at", { ascending: false });

    if (r.error) { setMsg("Load submissions failed: " + r.error.message); setMyReqs([]); return; }
    setMyReqs((r.data as any) || []);
  }

  async function submit() {
    setMsg(null);
    const pn = playerName.trim();
    const an = allianceName.trim();
    if (!pn) return setMsg("Name is required.");
    if (!an) return setMsg("Alliance name is required.");
    if (!typeId) return setMsg("Select an achievement.");

    if (type?.requires_option && !optionId) return setMsg("This achievement requires selecting a weapon/option.");

    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id || null;
    if (!uid) return setMsg("Not logged in.");

    const payload: any = {
      state_code: STATE,
      requester_user_id: uid,
      player_name: pn,
      alliance_name: an,
      achievement_type_id: typeId,
      option_id: optionId || null,
      status: "submitted",
      current_count: 0,
      notes: notes.trim() || null,
      created_at: nowUtc(),
      updated_at: nowUtc(),
    };

    const r = await supabase.from("state_achievement_requests").insert(payload).select("id").maybeSingle();
    if (r.error) return setMsg("Submit failed: " + r.error.message);

    setMsg("✅ Submitted! Owner will track progress on the Owner dashboard.");
    setNotes("");
    await loadMyReqs();
  }

  useEffect(() => { loadTypes(); loadMyReqs(); }, []);
  useEffect(() => { loadOptions(typeId); }, [typeId]);

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🏆 State 789 — Achievements</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => { loadTypes(); loadMyReqs(); }}>
            Refresh
          </button>
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
        <div style={{ fontWeight: 900 }}>Submit Achievement Request</div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          <input className="zombie-input" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Name (in-game)" style={{ padding: "10px 12px" }} />
          <input className="zombie-input" value={allianceName} onChange={(e) => setAllianceName(e.target.value)} placeholder="Alliance name" style={{ padding: "10px 12px" }} />

          <select className="zombie-input" value={typeId} onChange={(e) => setTypeId(e.target.value)} style={{ padding: "10px 12px" }}>
            <option value="">Select Achievement…</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}{t.required_count > 1 ? ` (${t.required_count}x)` : ""}
              </option>
            ))}
          </select>

          {type?.requires_option ? (
            <select className="zombie-input" value={optionId} onChange={(e) => setOptionId(e.target.value)} style={{ padding: "10px 12px" }}>
              <option value="">Select Weapon/Option…</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : null}

          <textarea className="zombie-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" style={{ padding: "10px 12px", minHeight: 90 }} />

          <button className="zombie-btn" style={{ padding: "12px 14px", fontWeight: 900 }} onClick={submit}>
            Submit
          </button>
        </div>

        <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
          If you chose SWP Weapon, you must select a weapon. Owner can add more achievements/weapons later.
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 900 }}>My Submissions</div>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => copyText(JSON.stringify({ version: 1, state: STATE, exportedUtc: nowUtc(), submissions: myReqs }, null, 2))}>
            Export My Submissions
          </button>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {myReqs.map((r) => {
            const t = r.state_achievement_types?.name || "Achievement";
            const opt = r.state_achievement_options?.label ? (" — " + r.state_achievement_options.label) : "";
            const prog = (r.required_count || 1) > 1 ? ` (${r.current_count || 0}/${r.required_count})` : "";
            const done = r.status === "completed" ? " ✅" : "";
            return (
              <div key={r.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                <div style={{ fontWeight: 900 }}>{t}{opt}{prog}{done}</div>
                <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
                  Status: {r.status} • Submitted: {r.created_at}
                </div>
                {r.notes ? <div style={{ marginTop: 8, opacity: 0.8, whiteSpace: "pre-wrap" }}>{r.notes}</div> : null}
              </div>
            );
          })}
          {myReqs.length === 0 ? <div style={{ opacity: 0.75 }}>No submissions yet.</div> : null}
        </div>
      </div>
    </div>
  );
}