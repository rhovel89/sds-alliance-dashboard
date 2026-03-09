import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";
import { supabase } from "../../lib/supabaseClient";

type AnyRow = any;

function s(v: any) { return v === null || v === undefined ? "" : String(v); }
function norm(v: any) { return s(v).trim(); }
function getPlayerName(r: AnyRow): string { return norm(r?.player_name || r?.game_name || r?.player || r?.name || "Unknown"); }

export default function OwnerPlayerProgressComparePage() {
  const nav = useNavigate();
  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);

  function onSelectModule(k: string) {
    const to = cc.find((m) => m.key === k)?.to;
    if (to) nav(to);
  }

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [requests, setRequests] = useState<AnyRow[]>([]);
  const [types, setTypes] = useState<AnyRow[]>([]);
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [q3, setQ3] = useState("");

  async function loadAll() {
    try {
      setLoading(true);
      setStatus("");

      const t = await supabase
        .from("state_achievement_types")
        .select("*")
        .eq("state_code", "789")
        .order("name", { ascending: true });

      if (t.error) throw t.error;
      setTypes((t.data || []) as AnyRow[]);

      const r = await supabase
        .from("state_achievement_requests")
        .select("*")
        .eq("state_code", "789")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (r.error) throw r.error;
      setRequests((r.data || []) as AnyRow[]);
    } catch (e: any) {
      setStatus(String(e?.message || e || "Load failed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const playerOptions = useMemo(() => {
    const vals = Array.from(new Set(requests.map((r) => getPlayerName(r)).filter(Boolean)));
    return vals.sort((a, b) => a.localeCompare(b));
  }, [requests]);

  const selectedPlayers = [q1, q2, q3].map((x) => String(x || "").trim()).filter(Boolean);

  const comparison = useMemo(() => {
    return selectedPlayers.map((player) => {
      const rows = requests.filter((r) => getPlayerName(r) === player);

      const completedTypes = new Set<string>();
      const activeTypes = new Set<string>();

      for (const r of rows) {
        const typeId = String(r?.achievement_type_id || "");
        if (!typeId) continue;
        activeTypes.add(typeId);
        if (String(r?.status || "").toLowerCase() === "completed") completedTypes.add(typeId);
      }

      return {
        player,
        totalRows: rows.length,
        completedTypes: completedTypes.size,
        activeTypes: activeTypes.size,
        missingTypes: Math.max(0, types.length - completedTypes.size),
      };
    });
  }, [selectedPlayers, requests, types]);

  return (
    <CommandCenterShell
      title="Owner • Player Progress Compare"
      subtitle="Compare multiple players side by side"
      modules={modules}
      activeModuleKey="owner"
      onSelectModule={onSelectModule}
      topRight={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/player-progress")}>Player Progress</button>
          <button className="zombie-btn" type="button" onClick={() => void loadAll()} disabled={loading}>Refresh</button>
        </div>
      }
    >
      {status ? <div style={{ marginBottom: 10, border: "1px solid rgba(176,18,27,0.35)", background: "rgba(176,18,27,0.12)", borderRadius: 12, padding: 10 }}>{status}</div> : null}

      <div style={{ display: "grid", gap: 12 }}>
        {[["Player 1", q1, setQ1], ["Player 2", q2, setQ2], ["Player 3", q3, setQ3]].map(([label, value, setter]: any, idx) => (
          <div key={idx}>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>{label}</div>
            <input
              value={value}
              onChange={(e) => setter(e.target.value)}
              list={`compare-player-options-${idx}`}
              placeholder="Search player..."
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.25)",
                color: "rgba(255,255,255,0.92)"
              }}
            />
            <datalist id={`compare-player-options-${idx}`}>
              {playerOptions.slice(0, 200).map((x) => <option key={x} value={x} />)}
            </datalist>
          </div>
        ))}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {comparison.map((x) => (
            <div key={x.player} style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
              <div style={{ fontWeight: 950, fontSize: 20 }}>{x.player}</div>
              <div style={{ marginTop: 8, opacity: 0.8 }}>Rows: {x.totalRows}</div>
              <div style={{ marginTop: 4, opacity: 0.8 }}>Completed Types: {x.completedTypes}</div>
              <div style={{ marginTop: 4, opacity: 0.8 }}>Active Types: {x.activeTypes}</div>
              <div style={{ marginTop: 4, opacity: 0.8 }}>Missing Types: {x.missingTypes}</div>
            </div>
          ))}
        </div>
      </div>
    </CommandCenterShell>
  );
}
