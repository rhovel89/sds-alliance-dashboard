import React, { useEffect, useMemo, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type AchievementCategory = "State" | "Alliance" | "Events";
type Scope = "global" | "alliance";

type Achievement = {
  id: string;
  createdUtc: string;
  updatedUtc: string;
  pinned: boolean;

  scope: Scope;
  allianceCode: string | null; // required when scope === "alliance"

  category: AchievementCategory;
  title: string;
  notes: string;

  progress: number; // 0..100
  points: number;   // manual points for leaderboard
  completedUtc: string | null; // auto-set when progress hits 100
};

type StoreV1 = { version: 1; items: any[] };
type StoreV2 = { version: 2; items: Achievement[] };

type DirItem = { id: string; code: string; name: string; state: string };

const KEY_V1 = "sad_state789_achievements_v1";
const KEY_V2 = "sad_state789_achievements_v2";
const DIR_KEY = "sad_alliance_directory_v1";

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}
function nowUtc() {
  return new Date().toISOString();
}
function clampProgress(n: number) {
  if (!isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
}
function clampPoints(n: number) {
  if (!isFinite(n)) return 0;
  const x = Math.round(n);
  return x < 0 ? 0 : x;
}
function safeJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function loadDir(): DirItem[] {
  const raw = safeJson<any>(localStorage.getItem(DIR_KEY));
  const items = Array.isArray(raw?.items) ? raw.items : [];
  return items
    .filter((x: any) => x && x.code)
    .map((x: any) => ({
      id: String(x.id || uid()),
      code: String(x.code).toUpperCase(),
      name: String(x.name || x.code),
      state: String(x.state || "789"),
    }));
}

function migrateFromV1IfNeeded(): StoreV2 {
  const v2 = safeJson<StoreV2>(localStorage.getItem(KEY_V2));
  if (v2 && v2.version === 2 && Array.isArray(v2.items)) return v2;

  const v1 = safeJson<StoreV1>(localStorage.getItem(KEY_V1));
  if (v1 && v1.version === 1 && Array.isArray(v1.items) && v1.items.length) {
    const items: Achievement[] = v1.items
      .filter((x: any) => x && (x.title || x.name))
      .map((x: any) => {
        const progress = clampProgress(Number(x.progress ?? 0));
        const completedUtc = progress >= 100 ? String(x.completedUtc || x.completed_at || nowUtc()) : null;

        return {
          id: String(x.id || uid()),
          createdUtc: String(x.createdUtc || x.created_at || nowUtc()),
          updatedUtc: String(x.updatedUtc || x.updated_at || nowUtc()),
          pinned: !!x.pinned,

          scope: "global",
          allianceCode: null,

          category: (String(x.category || "State") as any) as AchievementCategory,
          title: String(x.title || x.name || "Untitled"),
          notes: String(x.notes || ""),

          progress,
          points: clampPoints(Number(x.points ?? 0)),
          completedUtc,
        };
      });

    const migrated: StoreV2 = { version: 2, items };
    try { localStorage.setItem(KEY_V2, JSON.stringify(migrated)); } catch {}
    return migrated;
  }

  return { version: 2, items: [] };
}

function saveStore(s: StoreV2) {
  try {
    localStorage.setItem(KEY_V2, JSON.stringify(s));
  } catch {}
}

function fmtLocal(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

type SortMode = "pinned_updated" | "points_desc" | "progress_desc" | "completed_first" | "title_az";

type DiscordTemplate =
  | "quick"
  | "completed"
  | "leaderboard"
  | "by_category";

export default function State789AchievementsPage() {
  const dir = useMemo(() => loadDir(), []);
  const [store, setStore] = useState<StoreV2>(() => migrateFromV1IfNeeded());
  useEffect(() => saveStore(store), [store]);

  // ---- Scope + filters ----
  const [scope, setScope] = useState<Scope>("alliance");
  const [allianceCode, setAllianceCode] = useState<string>((dir[0]?.code || "WOC").toUpperCase());
  const effectiveAlliance = useMemo(
    () => (scope === "alliance" ? String(allianceCode || "").toUpperCase() : null),
    [scope, allianceCode]
  );

  const [categoryFilter, setCategoryFilter] = useState<"All" | AchievementCategory>("All");
  const [sortMode, setSortMode] = useState<SortMode>("pinned_updated");
  const [discordTpl, setDiscordTpl] = useState<DiscordTemplate>("quick");

  // ---- Create form ----
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<AchievementCategory>("State");
  const [progress, setProgress] = useState<number>(0);
  const [points, setPoints] = useState<number>(0);
  const [notes, setNotes] = useState("");

  function filteredItems(items: Achievement[]) {
    return (items || []).filter((a) => {
      if (a.scope !== scope) return false;
      if (scope === "alliance") {
        if (String(a.allianceCode || "").toUpperCase() !== String(effectiveAlliance || "").toUpperCase()) return false;
      }
      if (categoryFilter !== "All" && a.category !== categoryFilter) return false;
      return true;
    });
  }

  const view = useMemo(() => {
    const items = filteredItems(store.items || []);
    const sorted = [...items];

    sorted.sort((a, b) => {
      // primary pinned if applicable
      if (sortMode === "pinned_updated") {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return String(b.updatedUtc).localeCompare(String(a.updatedUtc));
      }
      if (sortMode === "points_desc") {
        if (a.points !== b.points) return b.points - a.points;
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return String(b.updatedUtc).localeCompare(String(a.updatedUtc));
      }
      if (sortMode === "progress_desc") {
        if (a.progress !== b.progress) return b.progress - a.progress;
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return String(b.updatedUtc).localeCompare(String(a.updatedUtc));
      }
      if (sortMode === "completed_first") {
        const ac = a.progress >= 100 ? 1 : 0;
        const bc = b.progress >= 100 ? 1 : 0;
        if (ac !== bc) return bc - ac;
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return String(b.updatedUtc).localeCompare(String(a.updatedUtc));
      }
      // title_az
      return String(a.title).localeCompare(String(b.title));
    });

    return sorted;
  }, [store.items, scope, effectiveAlliance, categoryFilter, sortMode]);

  // ---- Leaderboard / totals (for current view) ----
  const totals = useMemo(() => {
    const items = view;
    const totalPoints = items.reduce((s, a) => s + (a.points || 0), 0);
    const completedCount = items.filter((a) => a.progress >= 100).length;
    const avgProgress = items.length ? Math.round(items.reduce((s, a) => s + (a.progress || 0), 0) / items.length) : 0;

    const byCategory: Record<string, { count: number; points: number; completed: number }> = {
      State: { count: 0, points: 0, completed: 0 },
      Alliance: { count: 0, points: 0, completed: 0 },
      Events: { count: 0, points: 0, completed: 0 },
    };

    for (const a of items) {
      const key = a.category;
      const b = byCategory[key];
      b.count += 1;
      b.points += (a.points || 0);
      if (a.progress >= 100) b.completed += 1;
    }

    const top = [...items].sort((a, b) => (b.points - a.points) || String(b.updatedUtc).localeCompare(String(a.updatedUtc))).slice(0, 10);

    return { totalPoints, completedCount, avgProgress, byCategory, top };
  }, [view]);

  function upsert(id: string, patch: Partial<Achievement>) {
    setStore((p) => {
      const next = { ...p, items: [...(p.items || [])] };
      const idx = next.items.findIndex((x) => x.id === id);
      if (idx < 0) return p;

      const cur = next.items[idx];
      const merged: Achievement = { ...cur, ...patch, updatedUtc: nowUtc() };

      // Milestone rule (deterministic):
      // - If progress >= 100 and no completedUtc => set completedUtc now
      // - If progress < 100 => clear completedUtc (so it reflects current state)
      const prog = clampProgress(Number(merged.progress ?? 0));
      merged.progress = prog;

      if (prog >= 100) {
        if (!merged.completedUtc) merged.completedUtc = nowUtc();
      } else {
        merged.completedUtc = null;
      }

      merged.points = clampPoints(Number(merged.points ?? 0));

      next.items[idx] = merged;
      return next;
    });
  }

  function togglePin(id: string) {
    const a = store.items.find((x) => x.id === id);
    if (!a) return;
    upsert(id, { pinned: !a.pinned });
  }

  function del(id: string) {
    if (!window.confirm("Delete achievement?")) return;
    setStore((p) => ({ ...p, items: (p.items || []).filter((x) => x.id !== id) }));
  }

  function create() {
    const t = title.trim();
    if (!t) return window.alert("Title required.");

    const prog = clampProgress(progress);
    const pts = clampPoints(points);

    const item: Achievement = {
      id: uid(),
      createdUtc: nowUtc(),
      updatedUtc: nowUtc(),
      pinned: false,

      scope,
      allianceCode: scope === "alliance" ? effectiveAlliance : null,

      category,
      title: t,
      notes: notes || "",

      progress: prog,
      points: pts,
      completedUtc: prog >= 100 ? nowUtc() : null,
    };

    setStore((p) => ({ ...p, items: [item, ...(p.items || [])] }));
    setTitle("");
    setNotes("");
    setProgress(0);
    setPoints(0);
  }

  // ---- Export/Import per category (filter based) ----
  async function exportFiltered() {
    const payload = {
      version: 2,
      exportedUtc: nowUtc(),
      scope,
      allianceCode: scope === "alliance" ? effectiveAlliance : null,
      category: categoryFilter,
      sort: sortMode,
      items: view,
    };
    const txt = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(txt);
      window.alert("Copied export JSON (filtered by current scope/category).");
    } catch {
      window.prompt("Copy:", txt);
    }
  }

  function importJson() {
    const raw = window.prompt("Paste export JSON:");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      const items = Array.isArray(p?.items) ? p.items : null;
      if (!items) throw new Error("Invalid payload");

      // Normalize items to Achievement v2
      const normalized: Achievement[] = items
        .filter((x: any) => x && (x.title || x.name))
        .map((x: any) => {
          const prog = clampProgress(Number(x.progress ?? 0));
          const completedUtc = prog >= 100 ? String(x.completedUtc || x.completed_at || nowUtc()) : null;

          const sc: Scope = (x.scope === "global" || x.scope === "alliance") ? x.scope : "global";
          const ac = sc === "alliance" ? String(x.allianceCode || x.alliance_code || "").toUpperCase() : null;

          const cat: AchievementCategory = (x.category === "State" || x.category === "Alliance" || x.category === "Events")
            ? x.category
            : "State";

          return {
            id: String(x.id || uid()),
            createdUtc: String(x.createdUtc || x.created_at || nowUtc()),
            updatedUtc: String(x.updatedUtc || x.updated_at || nowUtc()),
            pinned: !!x.pinned,

            scope: sc,
            allianceCode: ac,

            category: cat,
            title: String(x.title || x.name || "Untitled"),
            notes: String(x.notes || ""),

            progress: prog,
            points: clampPoints(Number(x.points ?? 0)),
            completedUtc,
          };
        });

      // Merge strategy: append imported as new records if IDs collide
      setStore((cur) => {
        const existing = new Set((cur.items || []).map((x) => x.id));
        const merged: Achievement[] = [...(cur.items || [])];

        for (const a of normalized) {
          if (!existing.has(a.id)) {
            merged.unshift(a);
          } else {
            // collision: new id
            merged.unshift({ ...a, id: uid(), createdUtc: nowUtc(), updatedUtc: nowUtc() });
          }
        }
        return { version: 2, items: merged };
      });

      window.alert("Imported achievements into local store.");
    } catch (e: any) {
      window.alert("Invalid JSON: " + String(e?.message || e));
    }
  }

  // ---- Discord templates (selectable formats) ----
  function buildDiscordSummary(tpl: DiscordTemplate): string {
    const scopeLabel = scope === "global" ? "Global" : ("Alliance " + (effectiveAlliance || "—"));
    const catLabel = categoryFilter === "All" ? "All Categories" : categoryFilter;
    const header = `🏆 **State 789 — Achievements** (${scopeLabel} • ${catLabel})`;

    if (tpl === "completed") {
      const done = view.filter((a) => a.progress >= 100).slice(0, 30);
      const lines = [header, "", "✅ **Completed**"];
      if (!done.length) lines.push("- (none)");
      for (const a of done) lines.push(`- ${a.pinned ? "📌 " : ""}**${a.title}** (${a.category}) • ${a.points} pts • ${fmtLocal(a.completedUtc)}`);
      return lines.join("\n");
    }

    if (tpl === "leaderboard") {
      const lines = [header, "", "📊 **Leaderboard (Top Points)**"];
      if (!totals.top.length) lines.push("- (none)");
      totals.top.forEach((a, idx) => {
        const pct = a.progress >= 100 ? "✅" : `${a.progress}%`;
        lines.push(`${idx + 1}. ${a.pinned ? "📌 " : ""}**${a.title}** — ${a.points} pts • ${pct}`);
      });
      lines.push("");
      lines.push(`Totals: ${totals.totalPoints} pts • ${totals.completedCount}/${view.length} completed • Avg ${totals.avgProgress}%`);
      return lines.join("\n");
    }

    if (tpl === "by_category") {
      const lines = [header, ""];
      const cats: AchievementCategory[] = ["State", "Alliance", "Events"];
      for (const c of cats) {
        const items = view.filter((a) => a.category === c).slice(0, 15);
        lines.push(`**${c}** (${items.length})`);
        if (!items.length) {
          lines.push("- (none)");
        } else {
          for (const a of items) {
            const pct = a.progress >= 100 ? "✅" : `${a.progress}%`;
            lines.push(`- ${a.pinned ? "📌 " : ""}**${a.title}** — ${pct} • ${a.points} pts`);
          }
        }
        lines.push("");
      }
      lines.push(`Totals: ${totals.totalPoints} pts • ${totals.completedCount}/${view.length} completed • Avg ${totals.avgProgress}%`);
      return lines.join("\n");
    }

    // quick
    const lines = [header, ""];
    const items = view.slice(0, 25);
    if (!items.length) lines.push("- (none)");
    for (const a of items) {
      const pct = a.progress >= 100 ? "✅" : `${a.progress}%`;
      lines.push(`- ${a.pinned ? "📌 " : ""}**${a.title}** (${a.category}) — ${pct} • ${a.points} pts`);
    }
    lines.push("");
    lines.push(`Totals: ${totals.totalPoints} pts • ${totals.completedCount}/${view.length} completed • Avg ${totals.avgProgress}%`);
    return lines.join("\n");
  }

  async function copyDiscordSummary() {
    const txt = buildDiscordSummary(discordTpl);
    try {
      await navigator.clipboard.writeText(txt);
      window.alert("Copied Discord summary.");
    } catch {
      window.prompt("Copy:", txt);
    }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🏆 State 789 — Achievements</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={exportFiltered}>Export (filtered)</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={importJson}>Import</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ opacity: 0.75, fontSize: 12 }}>Scope</div>
          <select className="zombie-input" value={scope} onChange={(e) => setScope(e.target.value as any)} style={{ padding: "10px 12px" }}>
            <option value="alliance">Alliance</option>
            <option value="global">Global</option>
          </select>

          {scope === "alliance" ? (
            <>
              <div style={{ opacity: 0.75, fontSize: 12 }}>Alliance</div>
              <select className="zombie-input" value={allianceCode} onChange={(e) => setAllianceCode(e.target.value.toUpperCase())} style={{ padding: "10px 12px" }}>
                {(dir.length ? dir : [{ id: "x", code: "WOC", name: "WOC", state: "789" }]).map((d) => (
                  <option key={d.code} value={d.code}>{d.code} — {d.name}</option>
                ))}
              </select>
            </>
          ) : null}

          <div style={{ opacity: 0.75, fontSize: 12 }}>Category</div>
          <select className="zombie-input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as any)} style={{ padding: "10px 12px" }}>
            <option value="All">All</option>
            <option value="State">State</option>
            <option value="Alliance">Alliance</option>
            <option value="Events">Events</option>
          </select>

          <div style={{ opacity: 0.75, fontSize: 12 }}>Sort</div>
          <select className="zombie-input" value={sortMode} onChange={(e) => setSortMode(e.target.value as any)} style={{ padding: "10px 12px" }}>
            <option value="pinned_updated">Pinned + Updated</option>
            <option value="points_desc">Points (desc)</option>
            <option value="progress_desc">Progress (desc)</option>
            <option value="completed_first">Completed first</option>
            <option value="title_az">Title (A–Z)</option>
          </select>

          <div style={{ marginLeft: "auto", opacity: 0.75, fontSize: 12 }}>
            View: {view.length} items • {totals.completedCount} complete • {totals.totalPoints} pts
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ opacity: 0.75, fontSize: 12 }}>Discord Template</div>
          <select className="zombie-input" value={discordTpl} onChange={(e) => setDiscordTpl(e.target.value as any)} style={{ padding: "10px 12px" }}>
            <option value="quick">Quick bullets</option>
            <option value="completed">Completed only</option>
            <option value="leaderboard">Leaderboard</option>
            <option value="by_category">By category</option>
          </select>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={copyDiscordSummary}>Copy Discord Summary</button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 1.1fr)", gap: 12 }}>
        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>Add Achievement</div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Title</div>
            <input className="zombie-input" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} />
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Category</div>
              <select className="zombie-input" value={category} onChange={(e) => setCategory(e.target.value as any)} style={{ width: "100%", padding: "10px 12px" }}>
                <option value="State">State</option>
                <option value="Alliance">Alliance</option>
                <option value="Events">Events</option>
              </select>
            </div>

            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Progress (0–100)</div>
              <input className="zombie-input" type="number" value={progress} onChange={(e) => setProgress(clampProgress(Number(e.target.value)))} style={{ width: "100%", padding: "10px 12px" }} />
            </div>

            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Points</div>
              <input className="zombie-input" type="number" value={points} onChange={(e) => setPoints(clampPoints(Number(e.target.value)))} style={{ width: "100%", padding: "10px 12px" }} />
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Notes</div>
            <textarea className="zombie-input" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: "100%", minHeight: 100, padding: "10px 12px" }} />
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={create}>Save</button>
          </div>
        </div>

        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>Leaderboard + Totals (current view)</div>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            <div style={{ opacity: 0.85 }}>Total Points: <b>{totals.totalPoints}</b></div>
            <div style={{ opacity: 0.85 }}>Completed: <b>{totals.completedCount}</b> / {view.length}</div>
            <div style={{ opacity: 0.85 }}>Avg Progress: <b>{totals.avgProgress}%</b></div>
          </div>

          <div style={{ marginTop: 12, opacity: 0.75, fontSize: 12 }}>By Category</div>
          <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
            {(["State","Alliance","Events"] as AchievementCategory[]).map((c) => {
              const b = totals.byCategory[c];
              return (
                <div key={c} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                  <div style={{ fontWeight: 900 }}>{c}</div>
                  <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
                    {b.count} items • {b.completed} complete • {b.points} pts
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 12, opacity: 0.75, fontSize: 12 }}>Top Points</div>
          <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
            {totals.top.map((a, idx) => (
              <div key={a.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                <div style={{ fontWeight: 900 }}>{idx + 1}. {a.pinned ? "📌 " : ""}{a.title}</div>
                <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
                  {a.points} pts • {a.progress >= 100 ? "✅ Complete" : (a.progress + "%")} • {a.category}
                </div>
              </div>
            ))}
            {totals.top.length === 0 ? <div style={{ opacity: 0.75 }}>No items yet.</div> : null}
          </div>
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Achievements</div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {view.map((a) => (
            <div key={a.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>
                  {a.pinned ? "📌 " : ""}{a.title} {a.progress >= 100 ? "✅" : ""}
                </div>
                <div style={{ marginLeft: "auto", opacity: 0.65, fontSize: 12 }}>
                  {a.scope === "global" ? "Global" : ("Alliance " + (a.allianceCode || "—"))} • {a.category}
                </div>
              </div>

              <div style={{ marginTop: 6, opacity: 0.8, fontSize: 12 }}>
                Progress: <b>{a.progress}%</b> • Points: <b>{a.points}</b> • Completed: <b>{a.completedUtc ? fmtLocal(a.completedUtc) : "—"}</b>
              </div>

              {a.notes ? (
                <div style={{ marginTop: 8, opacity: 0.75, whiteSpace: "pre-wrap" }}>{a.notes}</div>
              ) : null}

              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ opacity: 0.75, fontSize: 12 }}>Progress</div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={a.progress}
                  onChange={(e) => upsert(a.id, { progress: clampProgress(Number(e.target.value)) })}
                  style={{ flex: 1, minWidth: 220 }}
                />
                <div style={{ width: 55, textAlign: "right", opacity: 0.85 }}>{a.progress}%</div>

                <div style={{ opacity: 0.75, fontSize: 12 }}>Points</div>
                <input
                  className="zombie-input"
                  type="number"
                  value={a.points}
                  onChange={(e) => upsert(a.id, { points: clampPoints(Number(e.target.value)) })}
                  style={{ width: 120, padding: "8px 10px" }}
                />
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => togglePin(a.id)}>{a.pinned ? "Unpin" : "Pin"}</button>
                <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => del(a.id)}>Delete</button>
              </div>
            </div>
          ))}
          {view.length === 0 ? <div style={{ opacity: 0.75 }}>No achievements in this view yet.</div> : null}
        </div>
      </div>
    </div>
  );
}