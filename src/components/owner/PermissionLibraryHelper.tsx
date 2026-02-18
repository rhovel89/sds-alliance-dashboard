import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type PermRow = {
  id?: string;
  label?: string | null;
  description?: string | null;
  scope?: string | null;
  key?: string | null;
};

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function upper(v: any) {
  return safeStr(v).toUpperCase();
}

async function tryLoadTable(table: string) {
  // Try common column sets; ignore errors and fallback
  const res = await supabase
    .from(table)
    .select("id,label,description,scope,key")
    .order("scope", { ascending: true })
    .order("key", { ascending: true })
    .limit(1000);

  return res;
}

const TABLE_CANDIDATES = [
  "permissions_v2",
  "permissions",
  "alliance_permissions",
  "app_permissions",
];

const SCOPE_OPTIONS = ["app", "state", "alliance", "player"] as const;

const KEY_TEMPLATES = [
  { label: "Alliance: Announcements View", scope: "alliance", key: "alliance.announcements.view" },
  { label: "Alliance: Announcements Edit", scope: "alliance", key: "alliance.announcements.edit" },
  { label: "Alliance: Guides View", scope: "alliance", key: "alliance.guides.view" },
  { label: "Alliance: Guides Edit", scope: "alliance", key: "alliance.guides.edit" },
  { label: "Alliance: HQ Map View", scope: "alliance", key: "alliance.hq_map.view" },
  { label: "Alliance: HQ Map Edit", scope: "alliance", key: "alliance.hq_map.edit" },
  { label: "Alliance: Calendar View", scope: "alliance", key: "alliance.calendar.view" },
  { label: "Alliance: Calendar Edit", scope: "alliance", key: "alliance.calendar.edit" },
  { label: "Alliance: Discord Settings Manage", scope: "alliance", key: "alliance.discord.manage" },
  { label: "State: Dashboard View", scope: "state", key: "state.dashboard.view" },
  { label: "State: Dashboard Edit", scope: "state", key: "state.dashboard.edit" },
  { label: "Owner/Admin: Full Access", scope: "app", key: "app.admin" },
] as const;

export default function PermissionLibraryHelper() {
  const [loading, setLoading] = useState(true);
  const [tableUsed, setTableUsed] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [perms, setPerms] = useState<PermRow[]>([]);
  const [q, setQ] = useState("");
  const [selectedKey, setSelectedKey] = useState<string>("");

  const selected = useMemo(() => {
    const k = safeStr(selectedKey);
    return perms.find((p) => safeStr(p.key) === k) ?? null;
  }, [perms, selectedKey]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return perms;

    return perms.filter((p) => {
      const s =
        `${p.label ?? ""} ${p.description ?? ""} ${p.scope ?? ""} ${p.key ?? ""}`.toLowerCase();
      return s.includes(qq);
    });
  }, [perms, q]);

  const copy = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      alert("Copied ✅");
    } catch {
      alert("Copy failed (browser blocked clipboard).");
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr(null);
      setTableUsed(null);
      setPerms([]);

      try {
        for (const t of TABLE_CANDIDATES) {
          const r = await tryLoadTable(t);
          if (!r.error) {
            if (cancelled) return;

            const rows = (r.data ?? []) as any[];
            setPerms(
              rows.map((x) => ({
                id: x.id,
                label: x.label ?? null,
                description: x.description ?? null,
                scope: x.scope ?? null,
                key: x.key ?? null,
              }))
            );
            setTableUsed(t);
            setLoading(false);
            return;
          }
        }

        if (!cancelled) {
          setErr(
            "Could not load permissions. None of the known tables were readable: " +
              TABLE_CANDIDATES.join(", ")
          );
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ marginTop: 14, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900 }}>🧩 Permission Helper (No Guessing)</div>
          <div style={{ opacity: 0.8, fontSize: 12 }}>
            Pick from existing permissions, copy keys/scopes, or use templates.
            Owner remains hard-coded full access (this helper does not change that).
          </div>
          {tableUsed ? (
            <div style={{ opacity: 0.7, fontSize: 12 }}>Loaded from: <code>{tableUsed}</code></div>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={() => {
              setQ("");
              setSelectedKey("");
            }}
            style={{ padding: "8px 10px", borderRadius: 10 }}
          >
            Clear
          </button>
        </div>
      </div>

      {err ? (
        <div style={{ marginTop: 10, padding: 10, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 10 }}>
          <b>Error:</b> {err}
        </div>
      ) : null}

      <details style={{ marginTop: 10 }} open>
        <summary style={{ cursor: "pointer", fontWeight: 800 }}>How to use (fast)</summary>
        <div style={{ marginTop: 10, opacity: 0.85, lineHeight: 1.4 }}>
          <ol style={{ marginTop: 0 }}>
            <li>Create permissions (Label + Scope + Key). Use templates if you’re unsure.</li>
            <li>Create roles, then attach permissions using the matrix below.</li>
            <li>Assign roles to players (Owner stays full access).</li>
          </ol>
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
            <b>Key format tip:</b> <code>scope.area.action</code> (examples: <code>alliance.calendar.edit</code>, <code>alliance.hq_map.view</code>).
          </div>
        </div>
      </details>

      <div style={{ marginTop: 12, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 900 }}>📚 Existing permissions (search + dropdown)</div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            <input
              placeholder="Search label / key / scope…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ padding: 10, borderRadius: 10 }}
            />

            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              style={{ padding: 10, borderRadius: 10 }}
              disabled={loading || filtered.length === 0}
            >
              <option value="">
                {loading ? "Loading…" : filtered.length ? "Select a permission…" : "No permissions found"}
              </option>
              {filtered.map((p) => {
                const k = safeStr(p.key);
                const label = safeStr(p.label) || "(no label)";
                const scope = safeStr(p.scope) || "(no scope)";
                return (
                  <option key={k || Math.random().toString(16)} value={k}>
                    {label} — {scope} — {k}
                  </option>
                );
              })}
            </select>
          </div>

          {selected ? (
            <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 10 }}>
              <div style={{ fontWeight: 800 }}>{selected.label || "(no label)"}</div>
              <div style={{ opacity: 0.85, fontSize: 12, whiteSpace: "pre-wrap" }}>{selected.description || ""}</div>
              <div style={{ marginTop: 8, display: "grid", gap: 6, fontSize: 12 }}>
                <div><b>Scope:</b> <code>{selected.scope || ""}</code></div>
                <div><b>Key:</b> <code>{selected.key || ""}</code></div>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={() => copy(safeStr(selected.key))} style={{ padding: "8px 10px", borderRadius: 10 }}>
                  Copy Key
                </button>
                <button onClick={() => copy(safeStr(selected.scope))} style={{ padding: "8px 10px", borderRadius: 10 }}>
                  Copy Scope
                </button>
                <button
                  onClick={() =>
                    copy(
                      JSON.stringify(
                        {
                          label: selected.label ?? null,
                          description: selected.description ?? null,
                          scope: selected.scope ?? null,
                          key: selected.key ?? null,
                        },
                        null,
                        2
                      )
                    )
                  }
                  style={{ padding: "8px 10px", borderRadius: 10, fontWeight: 800 }}
                >
                  Copy JSON
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 900 }}>🧱 Templates (safe defaults)</div>
          <div style={{ marginTop: 8, opacity: 0.85, fontSize: 12 }}>
            Use these when creating new permissions so the keys are consistent.
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ opacity: 0.8, fontSize: 12 }}>Scope options</span>
              <select
                onChange={(e) => {
                  const s = e.target.value;
                  if (!s) return;
                  copy(s);
                }}
                defaultValue=""
                style={{ padding: 10, borderRadius: 10 }}
              >
                <option value="">Copy a scope…</option>
                {SCOPE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ opacity: 0.8, fontSize: 12 }}>Key templates</span>
              <select
                onChange={(e) => {
                  const k = e.target.value;
                  if (!k) return;
                  copy(k);
                }}
                defaultValue=""
                style={{ padding: 10, borderRadius: 10 }}
              >
                <option value="">Copy a key template…</option>
                {KEY_TEMPLATES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label} — {t.scope} — {t.key}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Tip: After copying, paste into the “Create Permission” fields below (Label / Scope / Key).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
