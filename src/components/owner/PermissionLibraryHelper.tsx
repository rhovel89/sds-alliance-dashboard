import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type PermRow = {
  id?: string | null;
  label?: string | null;
  description?: string | null;
  scope?: string | null;
  key?: string | null;
};

function s(v: any) {
  return String(v ?? "").trim();
}

function pick(obj: any, keys: string[]) {
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined && obj[k] !== null) {
      return obj[k];
    }
  }
  return null;
}

function normalizeRow(x: any): PermRow {
  const id =
    pick(x, ["id", "uuid"]) ??
    null;

  const label =
    pick(x, ["label", "name", "title", "display_name"]) ??
    null;

  const key =
    pick(x, ["key", "code", "permission_key", "perm_key", "slug"]) ??
    null;

  const scope =
    pick(x, ["scope", "permission_scope", "area", "domain", "category"]) ??
    null;

  const description =
    pick(x, ["description", "details", "desc", "help", "notes"]) ??
    null;

  return {
    id: id ? String(id) : null,
    label: label ? String(label) : null,
    key: key ? String(key) : null,
    scope: scope ? String(scope) : null,
    description: description ? String(description) : null,
  };
}

// keep list small: the old version spammed a lot of failing calls
const TABLE_CANDIDATES = ["permissions", "alliance_permissions", "app_permissions", "permissions_v2"];

export default function PermissionLibraryHelper() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [tableUsed, setTableUsed] = useState<string | null>(null);
  const [sampleCols, setSampleCols] = useState<string[]>([]);

  const [perms, setPerms] = useState<PermRow[]>([]);
  const [q, setQ] = useState("");
  const [selectedKey, setSelectedKey] = useState("");

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return perms;
    return perms.filter((p) => {
      const blob = `${p.label ?? ""} ${p.description ?? ""} ${p.scope ?? ""} ${p.key ?? ""}`.toLowerCase();
      return blob.includes(qq);
    });
  }, [perms, q]);

  const selected = useMemo(() => {
    const k = s(selectedKey);
    if (!k) return null;
    return perms.find((p) => s(p.key) === k) ?? null;
  }, [perms, selectedKey]);

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
      setSampleCols([]);
      setPerms([]);

      try {
        for (const t of TABLE_CANDIDATES) {
          const r: any = await supabase.from(t).select("*").limit(1000);

          // table not found
          if (r?.status === 404 || r?.error?.code === "PGRST106") continue;

          // any other error (400/401/403/etc) -> try next table
          if (r?.error) continue;

          const rows = (r.data ?? []) as any[];
          const mapped = rows.map(normalizeRow);

          // Sort locally so we don't rely on DB column names
          mapped.sort((a, b) => {
            const as = s(a.scope).toLowerCase();
            const bs = s(b.scope).toLowerCase();
            if (as !== bs) return as.localeCompare(bs);
            return s(a.key).toLowerCase().localeCompare(s(b.key).toLowerCase());
          });

          // capture columns from first row for debugging
          const cols = rows[0] ? Object.keys(rows[0]) : [];
          if (!cancelled) {
            setTableUsed(t);
            setSampleCols(cols);
            setPerms(mapped);
          }
          setLoading(false);
          return;
        }

        if (!cancelled) {
          setErr("Could not load permissions. Likely: no permission table exists OR RLS is blocking reads for your user.");
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const KEY_TEMPLATES = [
    { label: "Alliance: Announcements View", scope: "alliance", key: "alliance.announcements.view" },
    { label: "Alliance: Announcements Edit", scope: "alliance", key: "alliance.announcements.edit" },
    { label: "Alliance: Guides View", scope: "alliance", key: "alliance.guides.view" },
    { label: "Alliance: Guides Edit", scope: "alliance", key: "alliance.guides.edit" },
    { label: "Alliance: HQ Map View", scope: "alliance", key: "alliance.hq_map.view" },
    { label: "Alliance: HQ Map Edit", scope: "alliance", key: "alliance.hq_map.edit" },
    { label: "Alliance: Calendar View", scope: "alliance", key: "alliance.calendar.view" },
    { label: "Alliance: Calendar Edit", scope: "alliance", key: "alliance.calendar.edit" },
    { label: "Alliance: Discord Manage", scope: "alliance", key: "alliance.discord.manage" },
    { label: "State: Dashboard View", scope: "state", key: "state.dashboard.view" },
    { label: "State: Dashboard Edit", scope: "state", key: "state.dashboard.edit" },
    { label: "Owner/Admin: Full Access", scope: "app", key: "app.admin" },
  ] as const;

  const SCOPE_OPTIONS = ["app", "state", "alliance", "player"] as const;

  return (
    <div style={{ marginTop: 14, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900 }}>🧩 Permission Helper</div>
          <div style={{ opacity: 0.8, fontSize: 12 }}>
            Loads permissions without guessing column names (prevents 400 spam).
          </div>
          {tableUsed ? (
            <div style={{ opacity: 0.7, fontSize: 12 }}>
              Loaded from: <code>{tableUsed}</code>
              {sampleCols.length ? <span> • columns: <code>{sampleCols.join(", ")}</code></span> : null}
            </div>
          ) : null}
        </div>
      </div>

      {err ? (
        <div style={{ marginTop: 10, padding: 10, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 10 }}>
          <b>Error:</b> {err}
        </div>
      ) : null}

      <div style={{ marginTop: 12, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 900 }}>📚 Existing permissions (dropdown)</div>

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
              {filtered.map((p, idx) => {
                const k = s(p.key);
                const label = s(p.label) || "(no label)";
                const scope = s(p.scope) || "(no scope)";
                // if key is missing, still show it but make value unique
                const value = k || `__row_${idx}__`;
                return (
                  <option key={value} value={value}>
                    {label} — {scope} — {k || "(missing key column)"}
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
                <button onClick={() => copy(s(selected.key))} style={{ padding: "8px 10px", borderRadius: 10 }}>
                  Copy Key
                </button>
                <button onClick={() => copy(s(selected.scope))} style={{ padding: "8px 10px", borderRadius: 10 }}>
                  Copy Scope
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 900 }}>🧱 Templates</div>
          <div style={{ marginTop: 8, opacity: 0.85, fontSize: 12 }}>
            Use these when creating new permissions so keys are consistent.
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ opacity: 0.8, fontSize: 12 }}>Scope</span>
              <select
                onChange={(e) => { if (e.target.value) copy(e.target.value); }}
                defaultValue=""
                style={{ padding: 10, borderRadius: 10 }}
              >
                <option value="">Copy a scope…</option>
                {SCOPE_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ opacity: 0.8, fontSize: 12 }}>Key template</span>
              <select
                onChange={(e) => { if (e.target.value) copy(e.target.value); }}
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
              Tip: paste the copied values into the “Create Permission” fields.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
