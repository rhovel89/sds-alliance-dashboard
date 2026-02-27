import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

const PREFILL_KEY = "sad_onboarding_prefill_v1";

type MapRow = { alliance_code: string; alliance_id: string };

export default function OnboardingWizardPage() {
  const nav = useNavigate();
  const [alliances, setAlliances] = useState<MapRow[]>([]);
  const [gameName, setGameName] = useState("");
  const [stateCode, setStateCode] = useState("789");
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      const r = await supabase.from("alliance_code_map").select("alliance_code,alliance_id").order("alliance_code", { ascending: true });
      if (!r.error) setAlliances((r.data ?? []) as any);
    })();
  }, []);

  function toggle(code: string) {
    const c = code.toUpperCase();
    setSelected((prev) => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  }

  function next() {
    if (!gameName.trim()) return alert("Enter your in-game name.");
    if (!selected.length) return alert("Pick at least one alliance.");
    try {
      localStorage.setItem(PREFILL_KEY, JSON.stringify({ version: 1, gameName: gameName.trim(), stateCode, alliances: selected }));
    } catch {}
    setStatus("Saved ✅ Redirecting…");
    nav("/onboarding");
  }

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>🧭 Onboarding Wizard</h2>
      <div style={{ opacity: 0.8, fontSize: 12 }}>{status}</div>

      <div className="zombie-card" style={{ marginTop: 12, padding: 14, borderRadius: 16 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <label>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>In-game name</div>
            <input value={gameName} onChange={(e) => setGameName(e.target.value)} placeholder="Your Puzzles & Survival name" />
          </label>

          <label>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>State</div>
            <input value={stateCode} onChange={(e) => setStateCode(e.target.value)} />
          </label>

          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Pick alliance(s)</div>
            <div style={{ display: "grid", gap: 8 }}>
              {alliances.map((a) => (
                <label key={a.alliance_code} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input type="checkbox" checked={selected.includes(a.alliance_code)} onChange={() => toggle(a.alliance_code)} />
                  <span style={{ fontWeight: 900 }}>{a.alliance_code}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="button" onClick={next}>Continue to Request Access</button>
          </div>
        </div>
      </div>
    </div>
  );
}
