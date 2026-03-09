import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";
import { supabase } from "../../lib/supabaseClient";

type AnyRow = any;

function loadPlayerProgressPresets(): any[] {
  try {
    const raw = localStorage.getItem("playerProgressPresets");
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function savePlayerProgressPresets(arr: any[]) {
  try {
    localStorage.setItem("playerProgressPresets", JSON.stringify(Array.isArray(arr) ? arr : []));
  } catch {}
}

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

function buildPlayerProgressCurrentViewLink(player: string, filter: string): string {
  const params = new URLSearchParams();
  if (String(player || "").trim()) params.set("player", String(player || "").trim());
  if (String(filter || "").trim() && String(filter || "") !== "all") params.set("filter", String(filter || "").trim());
  const qs = params.toString();
  return qs ? `/owner/player-progress?${qs}` : "/owner/player-progress";
}

function buildPlayerAchievementsLink(player: string, status: string): string {
  const params = new URLSearchParams();
  if (String(player || "").trim()) params.set("player", String(player || "").trim());
  if (String(status || "").trim()) params.set("status", String(status || "").trim());
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

  async function copyCurrentViewLink() {
    try {
      const url = window.location.origin + buildPlayerProgressCurrentViewLink(q, progressFilter);
      await navigator.clipboard.writeText(url);
      setStatus("Current view link copied ✅");
    } catch {
      setStatus("Copy failed.");
    }
  }

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [progressFilter, setProgressFilter] = useState(() => {
    const p = new URLSearchParams(window.location.search || "");
    return String(p.get("filter") || "all");
  });
  const [playerProgressPresets, setPlayerProgressPresets] = useState<any[]>([]);
  const [selectedPlayerProgressPreset, setSelectedPlayerProgressPreset] = useState("");
  const [newPlayerProgressPresetName, setNewPlayerProgressPresetName] = useState("");
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
    setPlayerProgressPresets(loadPlayerProgressPresets());
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

  function saveCurrentPlayerProgressPreset() {
    const name = String(newPlayerProgressPresetName || "").trim();
    if (!name) {
      setStatus("Enter a player progress preset name first.");
      return;
    }

    const preset = {
      name,
      q,
      progressFilter,
    };

    const next = [
      ...playerProgressPresets.filter((x) => String(x?.name || "").trim().toLowerCase() !== name.toLowerCase()),
      preset,
    ].sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));

    setPlayerProgressPresets(next);
    savePlayerProgressPresets(next);
    setSelectedPlayerProgressPreset(name);
    setNewPlayerProgressPresetName("");
    setStatus("Player progress preset saved ✅");
  }

  function applySelectedPlayerProgressPreset() {
    const name = String(selectedPlayerProgressPreset || "").trim();
    const preset = playerProgressPresets.find((x) => String(x?.name || "").trim() === name);
    if (!preset) {
      setStatus("Pick a player progress preset first.");
      return;
    }

    setQ(String(preset?.q || ""));
    setProgressFilter(String(preset?.progressFilter || "all"));
    setStatus("Player progress preset loaded ✅");
  }

  function deleteSelectedPlayerProgressPreset() {
    const name = String(selectedPlayerProgressPreset || "").trim();
    if (!name) {
      setStatus("Pick a player progress preset first.");
      return;
    }

    const next = playerProgressPresets.filter((x) => String(x?.name || "").trim() !== name);
    setPlayerProgressPresets(next);
    savePlayerProgressPresets(next);
    setSelectedPlayerProgressPreset("");
    setStatus("Player progress preset deleted ✅");
  }

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

  useEffect(() => {
    const params = new URLSearchParams();
    if (String(q || "").trim()) params.set("player", String(q || "").trim());
    if (String(progressFilter || "").trim() && String(progressFilter || "") !== "all") {
      params.set("filter", String(progressFilter || "").trim());
    }
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/owner/player-progress?${qs}` : "/owner/player-progress");
  }, [q, progressFilter]);

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

  const progressFilterCounts = useMemo(() => {
    const all = progressByType.length;
    const completed = progressByType.filter((x) => Number(x.missing || 0) <= 0).length;
    const incomplete = progressByType.filter((x) => Number(x.missing || 0) > 0).length;
    const onlyMissing = progressByType.filter((x) => Number(x.missing || 0) > 0).length;
    const submitted = progressByType.filter((x) => Number(x.submitted || 0) > 0).length;
    const inProgress = progressByType.filter((x) => {
      const missing = Number(x.missing || 0);
      const hasProgress = Number(x.current || 0) > 0;
      const hasInProgress = Number(x.inProgress || 0) > 0;
      return hasInProgress || (hasProgress && missing > 0);
    }).length;

    return {
      all,
      completed,
      incomplete,
      onlyMissing,
      submitted,
      inProgress,
    };
  }, [progressByType]);

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

        <div style={{ display: "grid", gap: 8 }}>
          <input
            value={newPlayerProgressPresetName}
            onChange={(e) => setNewPlayerProgressPresetName(String(e.target.value || ""))}
            placeholder="New player progress preset name..."
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.25)",
              color: "rgba(255,255,255,0.92)"
            }}
          />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="zombie-btn" type="button" onClick={() => saveCurrentPlayerProgressPreset()}>
              Save View Preset
            </button>
          </div>

          <select
            value={selectedPlayerProgressPreset}
            onChange={(e) => setSelectedPlayerProgressPreset(String(e.target.value || ""))}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.25)",
              color: "rgba(255,255,255,0.92)"
            }}
          >
            <option value="">Select saved player progress preset...</option>
            {playerProgressPresets.map((p) => (
              <option key={String(p?.name || "")} value={String(p?.name || "")}>
                {String(p?.name || "")}
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="zombie-btn" type="button" onClick={() => applySelectedPlayerProgressPreset()} disabled={!selectedPlayerProgressPreset}>
              Load View Preset
            </button>
            <button className="zombie-btn" type="button" onClick={() => deleteSelectedPlayerProgressPreset()} disabled={!selectedPlayerProgressPreset}>
              Delete View Preset
            </button>
          </div>
        </div>
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

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <button
                className="zombie-btn"
                type="button"
                onClick={() => void copyCurrentViewLink()}
              >
                Copy Current View
              </button>
              <button
                className="zombie-btn"
                type="button"
                onClick={() => nav(buildPlayerAchievementsLink(selectedPlayer, "submitted"))}
              >
                Open Submitted in Achievements
              </button>
              <button
                className="zombie-btn"
                type="button"
                onClick={() => nav(buildPlayerAchievementsLink(selectedPlayer, "in_progress"))}
              >
                Open In Progress in Achievements
              </button>
              <button
                className="zombie-btn"
                type="button"
                onClick={() => nav(buildPlayerAchievementsLink(selectedPlayer, "completed"))}
              >
                Open Completed in Achievements
              </button>
            </div>
          </div>
        ) : (
          <div style={{ opacity: 0.72 }}>Search for a player to see progress.</div>
        )}

        {selectedPlayer ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="zombie-btn" type="button" onClick={() => setProgressFilter("all")}>All ({progressFilterCounts.all})</button>
            <button className="zombie-btn" type="button" onClick={() => setProgressFilter("completed")}>Completed ({progressFilterCounts.completed})</button>
            <button className="zombie-btn" type="button" onClick={() => setProgressFilter("incomplete")}>Incomplete ({progressFilterCounts.incomplete})</button>
            <button className="zombie-btn" type="button" onClick={() => setProgressFilter("only_missing")}>Only Missing ({progressFilterCounts.onlyMissing})</button>
            <button className="zombie-btn" type="button" onClick={() => setProgressFilter("submitted")}>Submitted ({progressFilterCounts.submitted})</button>
            <button className="zombie-btn" type="button" onClick={() => setProgressFilter("in_progress")}>In Progress ({progressFilterCounts.inProgress})</button>
          </div>
        ) : null}

        {selectedPlayer ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="zombie-btn" type="button" onClick={() => setProgressFilter("all")}>All ({progressFilterCounts.all})</button>
            <button className="zombie-btn" type="button" onClick={() => setProgressFilter("completed")}>Completed ({progressFilterCounts.completed})</button>
            <button className="zombie-btn" type="button" onClick={() => setProgressFilter("incomplete")}>Incomplete ({progressFilterCounts.incomplete})</button>
            <button className="zombie-btn" type="button" onClick={() => setProgressFilter("only_missing")}>Only Missing ({progressFilterCounts.onlyMissing})</button>
            <button className="zombie-btn" type="button" onClick={() => setProgressFilter("submitted")}>Submitted ({progressFilterCounts.submitted})</button>
            <button className="zombie-btn" type="button" onClick={() => setProgressFilter("in_progress")}>In Progress ({progressFilterCounts.inProgress})</button>
          </div>
        ) : null}

        {selectedPlayer ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <button
              className="zombie-btn"
              type="button"
              style={{ textAlign: "left", whiteSpace: "normal" }}
              onClick={() => setProgressFilter("all")}
            >
              <div style={{ opacity: 0.72, fontSize: 12 }}>Types Tracked</div>
              <div style={{ fontWeight: 950, fontSize: 26, marginTop: 6 }}>{progressSummary.totalTypes}</div>
            </button>

            <button
              className="zombie-btn"
              type="button"
              style={{ textAlign: "left", whiteSpace: "normal" }}
              onClick={() => setProgressFilter("completed")}
            >
              <div style={{ opacity: 0.72, fontSize: 12 }}>Completed Types</div>
              <div style={{ fontWeight: 950, fontSize: 26, marginTop: 6 }}>{progressSummary.completedTypes}</div>
            </button>

            <button
              className="zombie-btn"
              type="button"
              style={{ textAlign: "left", whiteSpace: "normal" }}
              onClick={() => setProgressFilter("in_progress")}
            >
              <div style={{ opacity: 0.72, fontSize: 12 }}>In Progress Types</div>
              <div style={{ fontWeight: 950, fontSize: 26, marginTop: 6 }}>{progressSummary.inProgressTypes}</div>
            </button>

            <button
              className="zombie-btn"
              type="button"
              style={{ textAlign: "left", whiteSpace: "normal" }}
              onClick={() => setProgressFilter("submitted")}
            >
              <div style={{ opacity: 0.72, fontSize: 12 }}>Submitted Types</div>
              <div style={{ fontWeight: 950, fontSize: 26, marginTop: 6 }}>{progressSummary.submittedTypes}</div>
            </button>

            <button
              className="zombie-btn"
              type="button"
              style={{ textAlign: "left", whiteSpace: "normal" }}
              onClick={() => setProgressFilter("only_missing")}
            >
              <div style={{ opacity: 0.72, fontSize: 12 }}>Closest Remaining</div>
              <div style={{ fontWeight: 900, fontSize: 16, marginTop: 6 }}>
                {progressSummary.closestTypeName || "—"}
              </div>
              <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4 }}>
                {progressSummary.closestTypeName ? `Missing ${progressSummary.closestMissing}` : "No remaining types"}
              </div>
            </button>
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
                  {Number(x.missing || 0) <= 0 ? (
                    <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(80,180,120,0.16)" }}>
                      Completed
                    </span>
                  ) : null}

                  {Number(x.inProgress || 0) > 0 ? (
                    <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(120,160,255,0.14)" }}>
                      In Progress
                    </span>
                  ) : null}

                  {Number(x.submitted || 0) > 0 ? (
                    <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,210,80,0.12)" }}>
                      Submitted
                    </span>
                  ) : null}

                  {Number(x.missing || 0) > 0 ? (
                    <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)" }}>
                      Missing {x.missing}
                    </span>
                  ) : null}

                  <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)" }}>
                    Completed Rows: {x.completed}
                  </span>

                  <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)" }}>
                    Current: {x.current}/{x.requiredCount}
                  </span>
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












