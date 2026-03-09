import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";
import { supabase } from "../../lib/supabaseClient";

type AnyRow = any;

function s(v: any) {
  return v === null || v === undefined ? "" : String(v);
}
function norm(v: any) {
  return s(v).trim();
}
function normLower(v: any) {
  return norm(v).toLowerCase();
}
function getPlayerName(r: AnyRow): string {
  return norm(r?.player_name || r?.game_name || r?.player || r?.name || "Unknown");
}
function getAllianceCode(r: AnyRow): string {
  return norm(r?.alliance_code || r?.alliance_name || r?.alliance || "—").toUpperCase();
}

function buildPlayerTypeAchievementsLink(player: string, typeName: string): string {
  const params = new URLSearchParams();
  if (String(player || "").trim()) params.set("player", String(player || "").trim());
  if (String(typeName || "").trim()) params.set("type", String(typeName || "").trim());
  return `/owner/state-achievements?${params.toString()}`;
}

export default function OwnerPlayerProgressPage() {
  const nav = useNavigate();
  const location = useLocation();
  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);

  function onSelectModule(k: string) {
    const to = cc.find((m) => m.key === k)?.to;
    if (to) nav(to);
  }

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [progressFilter, setProgressFilter] = useState("all");
  const [q, setQ] = useState(() => {
    const p = new URLSearchParams(window.location.search || "");
    return String(p.get("player") || "");
  });
  const [types, setTypes] = useState<AnyRow[]>([]);
  const [options, setOptions] = useState<AnyRow[]>([]);
  const [requests, setRequests] = useState<AnyRow[]>([]);

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
      const tData = (t.data || []) as AnyRow[];
      setTypes(tData);

      const typeIds = tData.map((x) => x?.id).filter(Boolean);
      if (typeIds.length > 0) {
        const op = await supabase
          .from("state_achievement_options")
          .select("*")
          .in("achievement_type_id", typeIds)
          .order("sort", { ascending: true })
          .order("label", { ascending: true });

        if (!op.error) setOptions((op.data || []) as AnyRow[]);
        else setOptions([]);
      } else {
        setOptions([]);
      }

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

  const typeById = useMemo(() => {
    const m: Record<string, AnyRow> = {};
    for (const t of types) {
      const id = String(t?.id || "");
      if (id) m[id] = t;
    }
    return m;
  }, [types]);

  const optionById = useMemo(() => {
    const m: Record<string, AnyRow> = {};
    for (const o of options) {
      const id = String(o?.id || "");
      if (id) m[id] = o;
    }
    return m;
  }, [options]);

  const playerOptions = useMemo(() => {
    const vals = Array.from(new Set(requests.map((r) => getPlayerName(r)).filter(Boolean)));
    return vals.sort((a, b) => a.localeCompare(b));
  }, [requests]);

  const needle = normLower(q);

  const playerRows = useMemo(() => {
    if (!needle) return [];
    return requests.filter((r) => getPlayerName(r).toLowerCase().includes(needle));
  }, [requests, needle]);

  const selectedPlayer = useMemo(() => {
    if (!needle) return "";
    const exact = playerOptions.find((x) => x.toLowerCase() === needle);
    if (exact) return exact;
    return playerRows.length ? getPlayerName(playerRows[0]) : "";
  }, [needle, playerOptions, playerRows]);

  const selectedPlayerRows = useMemo(() => {
    if (!selectedPlayer) return [];
    return requests.filter((r) => getPlayerName(r) === selectedPlayer);
  }, [requests, selectedPlayer]);

  const playerAlliance = useMemo(() => {
    return selectedPlayerRows.length ? getAllianceCode(selectedPlayerRows[0]) : "—";
  }, [selectedPlayerRows]);

  const progressByType = useMemo(() => {
    const out: AnyRow[] = [];

    for (const t of types) {
      const typeId = String(t?.id || "");
      const typeName = String(t?.name || "Achievement");
      const requiredCount = Number(t?.required_count || 1);

      const rows = selectedPlayerRows.filter((r) => String(r?.achievement_type_id || "") === typeId);

      const completed = rows.filter((r) => String(r?.status || "").toLowerCase() === "completed").length;
      const inProgress = rows.filter((r) => String(r?.status || "").toLowerCase() === "in_progress").length;
      const submitted = rows.filter((r) => String(r?.status || "").toLowerCase() === "submitted").length;
      const current = rows.reduce((sum, r) => sum + Number(r?.current_count || 0), 0);

      if (!rows.length && !typeId) continue;

      out.push({
        typeId,
        typeName,
        requiredCount,
        current,
        completed,
        inProgress,
        submitted,
        missing: Math.max(0, requiredCount - current),
        options: rows.map((r) => {
          const opt = optionById[String(r?.option_id || "")];
          return opt?.label ? String(opt.label) : "";
        }).filter(Boolean),
      });
    }

    return out.sort((a, b) => {
      if (a.missing !== b.missing) return a.missing - b.missing;
      return String(a.typeName).localeCompare(String(b.typeName));
    });
  }, [types, selectedPlayerRows, optionById]);

  const filteredProgressByType = useMemo(() => {
    return progressByType.filter((x) => {
      const missing = Number(x.missing || 0);
      const completed = missing <= 0;
      const hasProgress = Number(x.current || 0) > 0;
      const hasSubmitted = Number(x.submitted || 0) > 0;
      const hasInProgress = Number(x.inProgress || 0) > 0;

      if (progressFilter === "completed") return completed;
      if (progressFilter === "incomplete") return !completed;
      if (progressFilter === "only_missing") return missing > 0;
      if (progressFilter === "submitted") return hasSubmitted;
      if (progressFilter === "in_progress") return hasInProgress || (hasProgress && !completed);

      return true;
    });
  }, [progressByType, progressFilter]);

  const progressSummary = useMemo(() => {
    const totalTypes = filteredProgressByType.length;
    const completedTypes = filteredProgressByType.filter((x) => Number(x.missing || 0) <= 0).length;
    const inProgressTypes = filteredProgressByType.filter((x) => Number(x.current || 0) > 0 && Number(x.missing || 0) > 0).length;
    const submittedTypes = filteredProgressByType.filter((x) => Number(x.submitted || 0) > 0).length;

    const closest = filteredProgressByType
      .filter((x) => Number(x.missing || 0) > 0)
      .sort((a, b) => {
        if (Number(a.missing || 0) !== Number(b.missing || 0)) return Number(a.missing || 0) - Number(b.missing || 0);
        return String(a.typeName || "").localeCompare(String(b.typeName || ""));
      })[0];

    return {
      totalTypes,
      completedTypes,
      inProgressTypes,
      submittedTypes,
      closestTypeName: closest ? String(closest.typeName || "") : "",
      closestMissing: closest ? Number(closest.missing || 0) : 0,
    };
  }, [filteredProgressByType]);

  return (
    <CommandCenterShell
      title="Owner • Player Progress"
      subtitle="Read-only player progress across achievement types"
      modules={modules}
      activeModuleKey="owner"
      onSelectModule={onSelectModule}
      topRight={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/search")}>Search</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/state-achievements")}>Achievements</button>
          <button className="zombie-btn" type="button" onClick={() => void loadAll()} disabled={loading}>Refresh</button>
        </div>
      }
    >
      {status ? (
        <div style={{ marginBottom: 10, border: "1px solid rgba(176,18,27,0.35)", background: "rgba(176,18,27,0.12)", borderRadius: 12, padding: 10 }}>
          {status}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          list="player-progress-options"
          placeholder="Search player name..."
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.25)",
            color: "rgba(255,255,255,0.92)"
          }}
        />
        <datalist id="player-progress-options">
          {playerOptions.slice(0, 200).map((x) => (
            <option key={x} value={x} />
          ))}
        </datalist>

        {selectedPlayer ? (
          <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 950, fontSize: 22 }}>{selectedPlayer}</div>
            <div style={{ opacity: 0.75, marginTop: 4 }}>Alliance: {playerAlliance}</div>
            <div style={{ opacity: 0.75, marginTop: 4 }}>Rows: {selectedPlayerRows.length}</div>
          </div>
        ) : (
          <div style={{ opacity: 0.72 }}>Search for a player to see progress.</div>
        )}

        {selectedPlayer ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="zombie-btn" type="button" onClick={() => setProgressFilter("all")}>All</button>
            <button className="zombie-btn" type="button" onClick={() => setProgressFilter("completed")}>Completed</button>
            <button className="zombie-btn" type="button" onClick={() => setProgressFilter("incomplete")}>Incomplete</button>
            <button className="zombie-btn" type="button" onClick={() => setProgressFilter("only_missing")}>Only Missing</button>
            <button className="zombie-btn" type="button" onClick={() => setProgressFilter("submitted")}>Submitted</button>
            <button className="zombie-btn" type="button" onClick={() => setProgressFilter("in_progress")}>In Progress</button>
          </div>
        ) : null}

        {selectedPlayer ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
              <div style={{ opacity: 0.72, fontSize: 12 }}>Types Tracked</div>
              <div style={{ fontWeight: 950, fontSize: 26, marginTop: 6 }}>{progressSummary.totalTypes}</div>
            </div>

            <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
              <div style={{ opacity: 0.72, fontSize: 12 }}>Completed Types</div>
              <div style={{ fontWeight: 950, fontSize: 26, marginTop: 6 }}>{progressSummary.completedTypes}</div>
            </div>

            <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
              <div style={{ opacity: 0.72, fontSize: 12 }}>In Progress Types</div>
              <div style={{ fontWeight: 950, fontSize: 26, marginTop: 6 }}>{progressSummary.inProgressTypes}</div>
            </div>

            <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
              <div style={{ opacity: 0.72, fontSize: 12 }}>Submitted Types</div>
              <div style={{ fontWeight: 950, fontSize: 26, marginTop: 6 }}>{progressSummary.submittedTypes}</div>
            </div>

            <div style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
              <div style={{ opacity: 0.72, fontSize: 12 }}>Closest Remaining</div>
              <div style={{ fontWeight: 900, fontSize: 16, marginTop: 6 }}>
                {progressSummary.closestTypeName || "—"}
              </div>
              <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4 }}>
                {progressSummary.closestTypeName ? `Missing ${progressSummary.closestMissing}` : "No remaining types"}
              </div>
            </div>
          </div>
        ) : null}

        {selectedPlayer ? (
          <div style={{ display: "grid", gap: 10 }}>
            {filteredProgressByType.map((x) => (
              <div key={String(x.typeId || x.typeName)} style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div style={{ fontWeight: 900 }}>{x.typeName}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900 }}>{x.current}/{x.requiredCount}</div>
                    <button
                      className="zombie-btn"
                      type="button"
                      style={{ padding: "6px 10px", fontSize: 12 }}
                      onClick={() => nav(buildPlayerTypeAchievementsLink(selectedPlayer, x.typeName))}
                    >
                      Open in Achievements
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)" }}>Completed: {x.completed}</span>
                  <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)" }}>In Progress: {x.inProgress}</span>
                  <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)" }}>Submitted: {x.submitted}</span>
                  <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)" }}>Missing: {x.missing}</span>
                </div>

                {x.options.length ? (
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                    Options: {x.options.join(", ")}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </CommandCenterShell>
  );
}





