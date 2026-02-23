import React, { useEffect, useMemo, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type Kind = "counter" | "checkbox";

type AchievementDef = {
  id: string;
  createdUtc: string;
  updatedUtc: string;
  title: string;
  description: string;
  group: string;
  kind: Kind;
  target: number | null;
  points: number;
  archived: boolean;
};

type Progress = {
  updatedUtc: string;
  value: number | null;       // for counter
  completed: boolean | null;  // for checkbox
  updatedBy: string;
};

type Store = {
  version: 1;
  updatedUtc: string;
  defs: AchievementDef[];
  progress: {
    states: Record<string, Record<string, Progress>>;     // stateCode -> achievementId -> progress
    alliances: Record<string, Record<string, Progress>>;  // allianceCode -> achievementId -> progress
  };
};

const KEY = "sad_achievements_v1";
const DIR_KEY = "sad_alliance_directory_v1";

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}
function nowUtc() {
  return new Date().toISOString();
}
function safeJson(raw: string | null): any {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
function normCode(x: any) { return String(x || "").trim().toUpperCase(); }

function loadAlliances(): { code: string; name: string }[] {
  const p = safeJson(localStorage.getItem(DIR_KEY));
  const items = Array.isArray(p?.items) ? p.items : [];
  const out = items
    .filter((x: any) => x && x.code)
    .map((x: any) => ({ code: normCode(x.code), name: String(x.name || x.code) }))
    .filter((x: any) => x.code);
  out.sort((a, b) => a.code.localeCompare(b.code));
  return out.length ? out : [{ code: "WOC", name: "WOC" }];
}

function defaultStore(): Store {
  return {
    version: 1,
    updatedUtc: nowUtc(),
    defs: [],
    progress: { states: {}, alliances: {} },
  };
}

function loadStore(): Store {
  const p = safeJson(localStorage.getItem(KEY));
  if (p && p.version === 1 && Array.isArray(p.defs) && p.progress) return p as Store;
  return defaultStore();
}

function saveStore(s: Store) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...s, updatedUtc: nowUtc() })); } catch {}
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function computeComplete(def: AchievementDef, prog: Progress | null): { complete: boolean; pct: number; label: string } {
  if (!def) return { complete: false, pct: 0, label: "—" };

  if (def.kind === "checkbox") {
    const c = !!prog?.completed;
    return { complete: c, pct: c ? 100 : 0, label: c ? "Complete" : "Not complete" };
  }

  const target = def.target || 0;
  const v = Number(prog?.value || 0);
  if (target <= 0) return { complete: false, pct: 0, label: `${v}` };

  const pct = clamp(Math.round((v / target) * 100), 0, 100);
  const complete = v >= target;
  return { complete, pct, label: `${v}/${target}` };
}

function sumPoints(defs: AchievementDef[], progMap: Record<string, Progress>): { earned: number; total: number } {
  let total = 0;
  let earned = 0;

  for (const d of defs) {
    if (d.archived) continue;
    total += Number(d.points || 0);
    const p = progMap ? progMap[d.id] : null;
    const c = computeComplete(d, p);
    if (c.complete) earned += Number(d.points || 0);
  }

  return { earned, total };
}

export default function State789AchievementsPage() {
  const [store, setStore] = useState<Store>(() => loadStore());
  useEffect(() => saveStore(store), [store]);

  const [alliances, setAlliances] = useState(() => loadAlliances());

  const [scope, setScope] = useState<"state" | "alliance">("state");
  const [stateCode, setStateCode] = useState("789");
  const [allianceCode, setAllianceCode] = useState<string>(() => (alliances[0]?.code || "WOC"));

  useEffect(() => {
    // reload alliances once (in case directory changed)
    setAlliances(loadAlliances());
  }, []);

  const scopeKey = useMemo(() => {
    return scope === "state" ? normCode(stateCode || "789") : normCode(allianceCode || "WOC");
  }, [scope, stateCode, allianceCode]);

  const progressMap = useMemo(() => {
    if (scope === "state") return (store.progress.states[scopeKey] || {});
    return (store.progress.alliances[scopeKey] || {});
  }, [store.progress, scope, scopeKey]);

  const [q, setQ] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("");
  const [showArchived, setShowArchived] = useState(false);

  const groups = useMemo(() => {
    const s = new Set<string>();
    for (const d of store.defs || []) {
      if (!d.group) continue;
      s.add(d.group);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [store.defs]);

  const defs = useMemo(() => {
    const search = (q || "").trim().toLowerCase();
    const gf = (groupFilter || "").trim().toLowerCase();

    let arr = (store.defs || []).slice();
    if (!showArchived) arr = arr.filter((d) => !d.archived);
    if (gf) arr = arr.filter((d) => String(d.group || "").toLowerCase() === gf);
    if (search) {
      arr = arr.filter((d) => {
        const hay = `${d.title} ${d.description} ${d.group} ${d.kind}`.toLowerCase();
        return hay.includes(search);
      });
    }
    // sort: incomplete first, then points desc
    arr.sort((a, b) => {
      const ca = computeComplete(a, progressMap[a.id] || null);
      const cb = computeComplete(b, progressMap[b.id] || null);
      if (ca.complete !== cb.complete) return ca.complete ? 1 : -1;
      return Number(b.points || 0) - Number(a.points || 0);
    });
    return arr;
  }, [store.defs, q, groupFilter, showArchived, progressMap]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => (selectedId ? (store.defs || []).find((d) => d.id === selectedId) || null : null),
    [store.defs, selectedId]
  );

  // Editor fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [group, setGroup] = useState("General");
  const [kind, setKind] = useState<Kind>("counter");
  const [target, setTarget] = useState<string>("10");
  const [points, setPoints] = useState<string>("10");

  // Progress editor fields
  const [progressVal, setProgressVal] = useState<string>("0");
  const [updatedBy, setUpdatedBy] = useState<string>("Leadership");

  useEffect(() => {
    if (!selected) return;
    setTitle(selected.title || "");
    setDescription(selected.description || "");
    setGroup(selected.group || "General");
    setKind(selected.kind || "counter");
    setTarget(selected.target == null ? "" : String(selected.target));
    setPoints(String(selected.points || 0));

    const p = progressMap[selected.id] || null;
    setProgressVal(String(p?.value ?? 0));
  }, [selectedId]);

  function resetEditor() {
    setSelectedId(null);
    setTitle("");
    setDescription("");
    setGroup("General");
    setKind("counter");
    setTarget("10");
    setPoints("10");
    setProgressVal("0");
  }

  function upsertDef() {
    const t = (title || "").trim();
    if (!t) return alert("Title required.");
    const now = nowUtc();

    const d: AchievementDef = {
      id: selected?.id || uid(),
      createdUtc: selected?.createdUtc || now,
      updatedUtc: now,
      title: t,
      description: (description || "").trim(),
      group: (group || "General").trim() || "General",
      kind,
      target: kind === "counter" ? (target.trim() ? Number(target) : 0) : null,
      points: Number(points || 0),
      archived: selected?.archived || false,
    };

    setStore((p) => {
      const next = { ...p, updatedUtc: now, defs: [...(p.defs || [])] };
      const idx = next.defs.findIndex((x) => x.id === d.id);
      if (idx >= 0) next.defs[idx] = d;
      else next.defs.unshift(d);
      return next;
    });

    setSelectedId(d.id);
  }

  function toggleArchive(id: string) {
    const now = nowUtc();
    setStore((p) => ({
      ...p,
      updatedUtc: now,
      defs: (p.defs || []).map((d) => (d.id === id ? { ...d, archived: !d.archived, updatedUtc: now } : d)),
    }));
  }

  function delDef(id: string) {
    const d = (store.defs || []).find((x) => x.id === id);
    if (!d) return;
    if (!confirm(`Delete achievement "${d.title}"?`)) return;

    setStore((p) => ({
      ...p,
      updatedUtc: nowUtc(),
      defs: (p.defs || []).filter((x) => x.id !== id),
    }));

    // Also remove progress entries for this id across all scopes
    setStore((p) => {
      const next: Store = JSON.parse(JSON.stringify(p));
      for (const k of Object.keys(next.progress.states || {})) delete next.progress.states[k][id];
      for (const k of Object.keys(next.progress.alliances || {})) delete next.progress.alliances[k][id];
      next.updatedUtc = nowUtc();
      return next;
    });

    if (selectedId === id) resetEditor();
  }

  function setProgress() {
    if (!selected) return alert("Select an achievement first.");

    const now = nowUtc();
    const key = scopeKey;
    const by = (updatedBy || "Leadership").trim() || "Leadership";

    setStore((p) => {
      const next: Store = JSON.parse(JSON.stringify(p));

      if (scope === "state") {
        next.progress.states[key] = next.progress.states[key] || {};
        if (selected.kind === "checkbox") {
          next.progress.states[key][selected.id] = { updatedUtc: now, value: null, completed: true, updatedBy: by };
        } else {
          next.progress.states[key][selected.id] = { updatedUtc: now, value: Number(progressVal || 0), completed: null, updatedBy: by };
        }
      } else {
        next.progress.alliances[key] = next.progress.alliances[key] || {};
        if (selected.kind === "checkbox") {
          next.progress.alliances[key][selected.id] = { updatedUtc: now, value: null, completed: true, updatedBy: by };
        } else {
          next.progress.alliances[key][selected.id] = { updatedUtc: now, value: Number(progressVal || 0), completed: null, updatedBy: by };
        }
      }

      next.updatedUtc = now;
      return next;
    });
  }

  function toggleCompleteCheckbox() {
    if (!selected) return;
    if (selected.kind !== "checkbox") return;

    const now = nowUtc();
    const key = scopeKey;
    const by = (updatedBy || "Leadership").trim() || "Leadership";
    const cur = progressMap[selected.id]?.completed === true;

    setStore((p) => {
      const next: Store = JSON.parse(JSON.stringify(p));
      if (scope === "state") {
        next.progress.states[key] = next.progress.states[key] || {};
        next.progress.states[key][selected.id] = { updatedUtc: now, value: null, completed: !cur, updatedBy: by };
      } else {
        next.progress.alliances[key] = next.progress.alliances[key] || {};
        next.progress.alliances[key][selected.id] = { updatedUtc: now, value: null, completed: !cur, updatedBy: by };
      }
      next.updatedUtc = now;
      return next;
    });
  }

  function resetProgressForSelected() {
    if (!selected) return;
    if (!confirm("Reset progress for this achievement in the current scope?")) return;

    const now = nowUtc();
    const key = scopeKey;

    setStore((p) => {
      const next: Store = JSON.parse(JSON.stringify(p));
      if (scope === "state") {
        next.progress.states[key] = next.progress.states[key] || {};
        delete next.progress.states[key][selected.id];
      } else {
        next.progress.alliances[key] = next.progress.alliances[key] || {};
        delete next.progress.alliances[key][selected.id];
      }
      next.updatedUtc = now;
      return next;
    });
  }

  const totals = useMemo(() => sumPoints(store.defs || [], progressMap || {}), [store.defs, progressMap]);

  const leaderboard = useMemo(() => {
    const defsActive = (store.defs || []).filter((d) => !d.archived);
    const rows = (alliances || []).map((a) => {
      const map = store.progress.alliances[a.code] || {};
      const s = sumPoints(defsActive, map);
      return { code: a.code, name: a.name, earned: s.earned, total: s.total };
    });
    rows.sort((x, y) => y.earned - x.earned);
    return rows.slice(0, 12);
  }, [store.defs, store.progress.alliances, alliances]);

  async function exportJson() {
    const txt = JSON.stringify({ ...store, exportedUtc: nowUtc() }, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied Achievements export JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  function importJson() {
    const raw = window.prompt("Paste Achievements export JSON:");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      if (!p || p.version !== 1 || !Array.isArray(p.defs)) throw new Error("Invalid");
      localStorage.setItem(KEY, JSON.stringify(p));
      setStore(loadStore());
      setSelectedId(null);
      alert("Imported.");
    } catch {
      alert("Invalid JSON.");
    }
  }

  function clearAll() {
    if (!confirm("Clear ALL achievements + progress?")) return;
    try { localStorage.removeItem(KEY); } catch {}
    setStore(defaultStore());
    setSelectedId(null);
  }

  const selectedProgress = selected ? (progressMap[selected.id] || null) : null;
  const selectedComputed = selected ? computeComplete(selected, selectedProgress) : null;

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🏆 State 789 — Achievements Tracker (UI-only)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={exportJson}>Export</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={importJson}>Import</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={clearAll}>Clear</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ opacity: 0.75, fontSize: 12 }}>Scope</div>
          <select className="zombie-input" value={scope} onChange={(e) => setScope(e.target.value as any)} style={{ padding: "10px 12px" }}>
            <option value="state">State</option>
            <option value="alliance">Alliance</option>
          </select>

          {scope === "state" ? (
            <>
              <div style={{ opacity: 0.75, fontSize: 12 }}>State Code</div>
              <input className="zombie-input" value={stateCode} onChange={(e) => setStateCode(e.target.value)} style={{ padding: "10px 12px", width: 110 }} />
            </>
          ) : (
            <>
              <div style={{ opacity: 0.75, fontSize: 12 }}>Alliance</div>
              <select className="zombie-input" value={allianceCode} onChange={(e) => setAllianceCode(e.target.value.toUpperCase())} style={{ padding: "10px 12px", minWidth: 220 }}>
                {(alliances || []).map((a) => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
              </select>
            </>
          )}

          <div style={{ marginLeft: "auto", opacity: 0.75, fontSize: 12 }}>
            Points: <b>{totals.earned}</b> / {totals.total} (current scope: {scopeKey})
          </div>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input className="zombie-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search achievements…" style={{ padding: "10px 12px", minWidth: 220, flex: 1 }} />

          <div style={{ opacity: 0.75, fontSize: 12 }}>Group</div>
          <select className="zombie-input" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} style={{ padding: "10px 12px", minWidth: 180 }}>
            <option value="">(all)</option>
            {groups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>

          <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Show archived
          </label>

          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={resetEditor}>+ New</button>
          <div style={{ opacity: 0.6, fontSize: 12 }}>localStorage: {KEY}</div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(360px, 1.2fr)", gap: 12 }}>
        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>Achievements ({defs.length})</div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {defs.map((d) => {
              const sel = d.id === selectedId;
              const p = progressMap[d.id] || null;
              const c = computeComplete(d, p);

              return (
                <div
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  style={{
                    cursor: "pointer",
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: sel ? "rgba(120,255,120,0.08)" : "rgba(0,0,0,0.20)",
                  }}
                >
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900 }}>
                      {c.complete ? "✅ " : ""}{d.title}
                    </div>
                    <div style={{ marginLeft: "auto", opacity: 0.7, fontSize: 12 }}>
                      {d.points} pts • {d.kind === "checkbox" ? "checkbox" : ("target " + (d.target ?? 0))}
                    </div>
                  </div>

                  <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
                    {d.group ? `[${d.group}] ` : ""}{d.description || ""}
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.10)", overflow: "hidden" }}>
                      <div style={{ height: 8, width: `${c.pct}%`, background: "rgba(120,255,120,0.50)" }} />
                    </div>
                    <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
                      {c.label}{p?.updatedUtc ? ` • updated ${p.updatedUtc}` : ""}
                    </div>
                  </div>

                  <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={(ev) => { ev.stopPropagation(); toggleArchive(d.id); }}>
                      {d.archived ? "Unarchive" : "Archive"}
                    </button>
                    <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={(ev) => { ev.stopPropagation(); delDef(d.id); }}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}

            {defs.length === 0 ? <div style={{ opacity: 0.75 }}>No achievements yet.</div> : null}
          </div>
        </div>

        <div>
          <div className="zombie-card">
            <div style={{ fontWeight: 900 }}>{selected ? "Edit Achievement" : "New Achievement"}</div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div>
                <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Title</div>
                <input className="zombie-input" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} />
              </div>

              <div>
                <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Description</div>
                <textarea className="zombie-input" value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: "100%", minHeight: 90, padding: "10px 12px" }} />
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Group</div>
                  <input className="zombie-input" value={group} onChange={(e) => setGroup(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} placeholder="General / Events / Recruiting" />
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Kind</div>
                  <select className="zombie-input" value={kind} onChange={(e) => setKind(e.target.value as any)} style={{ width: "100%", padding: "10px 12px" }}>
                    <option value="counter">Counter (value/target)</option>
                    <option value="checkbox">Checkbox (complete/not)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Target</div>
                  <input className="zombie-input" value={target} onChange={(e) => setTarget(e.target.value)} disabled={kind !== "counter"} style={{ width: "100%", padding: "10px 12px", opacity: kind === "counter" ? 1 : 0.55 }} />
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Points</div>
                  <input className="zombie-input" value={points} onChange={(e) => setPoints(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={upsertDef}>{selected ? "Save" : "Create"}</button>
                <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={resetEditor}>Clear</button>
              </div>

              <div style={{ opacity: 0.65, fontSize: 12 }}>
                UI-only tracker. Later we can move defs + progress into Supabase with RLS + realtime.
              </div>
            </div>
          </div>

          <div className="zombie-card" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 900 }}>Progress (current scope)</div>

            {!selected ? (
              <div style={{ marginTop: 10, opacity: 0.75 }}>Select an achievement to update progress.</div>
            ) : (
              <>
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>
                    Scope: <b>{scope}</b> • Key: <b>{scopeKey}</b> • Last updated by: {selectedProgress?.updatedBy || "—"}
                  </div>

                  <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,0.10)", overflow: "hidden" }}>
                    <div style={{ height: 10, width: `${selectedComputed?.pct || 0}%`, background: "rgba(120,255,120,0.55)" }} />
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ fontWeight: 900 }}>
                      {selectedComputed?.complete ? "✅ Complete" : "⏳ In Progress"} • {selectedComputed?.label}
                    </div>
                    <div style={{ marginLeft: "auto", opacity: 0.75, fontSize: 12 }}>
                      {selected.points} pts
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>Updated by</div>
                    <input className="zombie-input" value={updatedBy} onChange={(e) => setUpdatedBy(e.target.value)} style={{ padding: "10px 12px", minWidth: 220 }} />

                    {selected.kind === "counter" ? (
                      <>
                        <div style={{ opacity: 0.75, fontSize: 12 }}>Value</div>
                        <input className="zombie-input" value={progressVal} onChange={(e) => setProgressVal(e.target.value)} style={{ padding: "10px 12px", width: 140 }} />
                        <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={setProgress}>Set Progress</button>
                      </>
                    ) : (
                      <>
                        <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={toggleCompleteCheckbox}>
                          Toggle Complete
                        </button>
                      </>
                    )}

                    <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={resetProgressForSelected}>Reset</button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="zombie-card" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 900 }}>Alliance Leaderboard (points)</div>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {leaderboard.map((r, idx) => (
                <div key={r.code} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900 }}>#{idx + 1} {r.code} — {r.name}</div>
                    <div style={{ marginLeft: "auto", opacity: 0.8, fontSize: 12 }}>{r.earned}/{r.total}</div>
                  </div>
                  <div style={{ marginTop: 8, height: 8, borderRadius: 999, background: "rgba(255,255,255,0.10)", overflow: "hidden" }}>
                    <div style={{ height: 8, width: `${r.total ? Math.round((r.earned / r.total) * 100) : 0}%`, background: "rgba(120,255,120,0.45)" }} />
                  </div>
                </div>
              ))}
              {leaderboard.length === 0 ? <div style={{ opacity: 0.75 }}>No alliances found (directory empty).</div> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}