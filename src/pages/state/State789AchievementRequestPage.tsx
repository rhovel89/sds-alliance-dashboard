import React, { useEffect, useMemo, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";
import { supabase } from "../../lib/supabaseClient";
import {
  addRequest,
  getStateOptions,
  getStateTypes,
  SatOption,
  SatType,
} from "../../lib/stateAchievementsLocalStore";

const STATE = "789";

function norm(s: any) { return String(s || "").trim(); }

export default function State789AchievementRequestPage() {
  const [userId, setUserId] = useState<string | null>(null);

  const [types, setTypes] = useState<SatType[]>(() => getStateTypes(STATE).filter(t => t.active));
  const [opts, setOpts] = useState<SatOption[]>(() => getStateOptions(STATE).filter(o => o.active));

  const [playerName, setPlayerName] = useState("");
  const [allianceName, setAllianceName] = useState("");
  const [typeId, setTypeId] = useState<string>(types[0]?.id || "");
  const [optionId, setOptionId] = useState<string>("");

  const selectedType = useMemo(() => types.find(t => t.id === typeId) || null, [types, typeId]);
  const optList = useMemo(() => opts.filter(o => o.typeId === typeId), [opts, typeId]);

  useEffect(() => {
    (async () => {
      try {
        const u = await supabase.auth.getUser();
        setUserId(u.data.user?.id || null);
      } catch {
        setUserId(null);
      }
    })();
  }, []);

  function reloadCatalog() {
    setTypes(getStateTypes(STATE).filter(t => t.active));
    setOpts(getStateOptions(STATE).filter(o => o.active));
  }

  async function submit() {
    const pn = norm(playerName);
    const an = norm(allianceName);
    if (!pn) return alert("Name required.");
    if (!an) return alert("Alliance name required.");
    if (!selectedType) return alert("Select an achievement.");

    let opt: string | null = null;
    if (selectedType.requiresOption) {
      const chosen = norm(optionId);
      if (!chosen) return alert("Select a weapon/option.");
      opt = chosen;
    }

    addRequest({
      stateCode: STATE,
      requesterUserId: userId,
      playerName: pn,
      allianceName: an,
      typeId: selectedType.id,
      optionId: opt,
      status: "pending",
      currentCount: 0,
      requiredCount: Math.max(1, Number(selectedType.requiredCount || 1)),
      notes: "",
    });

    alert("Submitted! (Stored locally. Owner can review in Owner → Requests.)");
    setPlayerName("");
    setAllianceName("");
    setOptionId("");
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>📝 State 789 — Achievement Request</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={reloadCatalog}>Reload Catalog</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ opacity: 0.7, fontSize: 12 }}>
          Storage mode: <b>local</b> (safe). Your submission appears for the owner on this same browser profile. Supabase wiring later.
        </div>
        <div style={{ marginTop: 6, opacity: 0.7, fontSize: 12 }}>UserId: {userId || "(not signed in)"}</div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Name</div>
            <input className="zombie-input" value={playerName} onChange={(e) => setPlayerName(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} />
          </div>

          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Alliance Name</div>
            <input className="zombie-input" value={allianceName} onChange={(e) => setAllianceName(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} />
          </div>

          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Achievement</div>
            <select className="zombie-input" value={typeId} onChange={(e) => { setTypeId(e.target.value); setOptionId(""); }} style={{ width: "100%", padding: "10px 12px" }}>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.requiredCount > 1 ? `(x${t.requiredCount})` : ""}
                </option>
              ))}
            </select>
          </div>

          {selectedType?.requiresOption ? (
            <div>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Weapon Needed / Wanted</div>
              <select className="zombie-input" value={optionId} onChange={(e) => setOptionId(e.target.value)} style={{ width: "100%", padding: "10px 12px" }}>
                <option value="">(select)</option>
                {optList.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
          ) : null}

          <button className="zombie-btn" style={{ padding: "12px 14px" }} onClick={submit}>
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}