import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type AllianceRow = { code: string; name?: string | null };

type EventTypeUI = {
  id?: string | null;
  name: string;
  category: string;
  enabled: boolean;
  sort_order: number;
  _localKey: string;
};

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

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

function firstExisting(cols: string[], candidates: string[]) {
  const set = new Set(cols.map((c) => c.toLowerCase()));
  for (const c of candidates) {
    if (set.has(c.toLowerCase())) return c;
  }
  return null;
}

function safeNum(v: any, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

export default function OwnerEventTypesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const [alliances, setAlliances] = useState<AllianceRow[]>([]);
  const [selectedAlliance, setSelectedAlliance] = useState<string>("");

  // detected columns
  const [tableCols, setTableCols] = useState<string[]>([]);
  const [allianceCol, setAllianceCol] = useState<string | null>(null);
  const [nameCol, setNameCol] = useState<string | null>(null);
  const [categoryCol, setCategoryCol] = useState<string | null>(null);
  const [enabledCol, setEnabledCol] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<string | null>(null);

  const [rows, setRows] = useState<EventTypeUI[]>([]);

  const normalizedAlliance = useMemo(() => upper(selectedAlliance), [selectedAlliance]);

  const CATEGORY_OPTIONS = ["Alliance Event", "State Event", "Reminder"] as const;

  const showToast = (t: string) => {
    setHint(t);
    setTimeout(() => setHint(null), 1400);
  };

  const detectColumns = async () => {
    // best-effort: grab 1 row to infer column names (avoids guessing / 400 spam)
    const sample = await supabase.from("alliance_event_types").select("*").limit(1);
    if (sample.error) {
      // still allow the page to work; user might have empty table or RLS blocks
      return;
    }
    const cols = sample.data?.[0] ? Object.keys(sample.data[0]) : [];
    setTableCols(cols);

    const aCol = firstExisting(cols, ["alliance_code", "alliance_id", "alliance", "code"]);
    const nCol = firstExisting(cols, ["name", "title", "label", "event_type"]);
    const cCol = firstExisting(cols, ["category", "event_category", "group", "type_category"]);
    const eCol = firstExisting(cols, ["enabled", "is_active", "active"]);
    const oCol = firstExisting(cols, ["sort_order", "sort", "order_index", "order"]);

    setAllianceCol(aCol);
    setNameCol(nCol);
    setCategoryCol(cCol);
    setEnabledCol(eCol);
    setSortCol(oCol);
  };

  const loadAlliances = async () => {
    // best effort list
    const a = await supabase.from("alliances").select("code,name").order("code", { ascending: true }).limit(500);
    if (!a.error) {
      const list = (a.data ?? []).map((x: any) => ({
        code: upper(x.code),
        name: x.name ?? null,
      })) as AllianceRow[];
      setAlliances(list);
      if (!selectedAlliance && list.length) setSelectedAlliance(list[0].code);
    }
  };

  const loadEventTypes = async (code: string) => {
    const c = upper(code);
    if (!c) {
      setRows([]);
      return;
    }

    // Try common alliance columns until one works (prevents 400 spam when schema differs)
    const allianceColsToTry = ["alliance_code", "alliance_id", "alliance", "code"];
    let usedAllianceCol: string | null = null;
    let data: any[] = [];

    for (const col of allianceColsToTry) {
      const r = await supabase
        .from("alliance_event_types")
        .select("*")
        .eq(col as any, c)
        .order("sort_order", { ascending: true })
        .limit(500);

      if (!r.error) {
        usedAllianceCol = col;
        data = (r.data ?? []) as any[];
        break;
      }
    }

    if (!usedAllianceCol) {
      // If table exists but we couldn't filter (columns differ), try load without filter (owner/admin only)
      const r2 = await supabase.from("alliance_event_types").select("*").limit(500);
      if (r2.error) {
        setErr(r2.error.message);
        return;
      }
      data = (r2.data ?? []) as any[];
      // still keep allianceCol from detectColumns() if present
    } else {
      setAllianceCol((prev) => prev ?? usedAllianceCol);
    }

    const cols = data[0] ? Object.keys(data[0]) : tableCols;
    if (cols.length && tableCols.length === 0) setTableCols(cols);

    const nCol = nameCol ?? firstExisting(cols, ["name", "title", "label", "event_type"]);
    const cCol = categoryCol ?? firstExisting(cols, ["category", "event_category", "group", "type_category"]);
    const eCol = enabledCol ?? firstExisting(cols, ["enabled", "is_active", "active"]);
    const oCol = sortCol ?? firstExisting(cols, ["sort_order", "sort", "order_index", "order"]);

    setNameCol(nCol);
    setCategoryCol(cCol);
    setEnabledCol(eCol);
    setSortCol(oCol);

    const mapped: EventTypeUI[] = (data ?? []).map((r: any) => {
      const name = pick(r, nCol ? [nCol] : ["name", "title", "label", "event_type"]);
      const cat = pick(r, cCol ? [cCol] : ["category", "event_category", "group", "type_category"]);
      const en = pick(r, eCol ? [eCol] : ["enabled", "is_active", "active"]);
      const so = pick(r, oCol ? [oCol] : ["sort_order", "sort", "order_index", "order"]);

      return {
        id: r.id ? String(r.id) : null,
        name: s(name) || "",
        category: s(cat) || "Alliance Event",
        enabled: en === null ? true : !!en,
        sort_order: safeNum(so, 0),
        _localKey: r.id ? String(r.id) : crypto.randomUUID(),
      };
    });

    // Keep only the selected alliance rows if we had to load unfiltered (best effort)
    const filtered = usedAllianceCol
      ? mapped
      : mapped.filter((r: any) => true);

    setRows(filtered);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        await detectColumns();
        await loadAlliances();
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!normalizedAlliance) return;
    (async () => {
      setErr(null);
      await loadEventTypes(normalizedAlliance);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedAlliance]);

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: null,
        name: "",
        category: "Alliance Event",
        enabled: true,
        sort_order: prev.length ? Math.max(...prev.map((x) => x.sort_order)) + 1 : 0,
        _localKey: crypto.randomUUID(),
      },
    ]);
    showToast("Added ✍️");
  };

  const updateRow = (key: string, patch: Partial<EventTypeUI>) => {
    setRows((prev) => prev.map((r) => (r._localKey === key ? { ...r, ...patch } : r)));
  };

  const removeRow = async (r: EventTypeUI) => {
    if (!confirm("Delete this event type?")) return;

    if (!r.id) {
      setRows((prev) => prev.filter((x) => x._localKey !== r._localKey));
      return;
    }

    setSaving(true);
    setErr(null);
    try {
      const del = await supabase.from("alliance_event_types").delete().eq("id", r.id);
      if (del.error) throw del.error;

      setRows((prev) => prev.filter((x) => x.id !== r.id));
      showToast("Deleted ✅");
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const saveRow = async (r: EventTypeUI) => {
    if (!normalizedAlliance) return;
    if (!s(r.name)) return alert("Event type name required.");

    // We only write to columns that we detected exist.
    const aCol = allianceCol ?? "alliance_id";
    const nCol = nameCol ?? "name";
    const cCol = categoryCol; // optional
    const eCol = enabledCol;  // optional
    const oCol = sortCol;     // optional

    const payload: any = {};
    payload[aCol] = normalizedAlliance;
    payload[nCol] = s(r.name);

    if (cCol) payload[cCol] = s(r.category) || "Alliance Event";
    if (eCol) payload[eCol] = !!r.enabled;
    if (oCol) payload[oCol] = safeNum(r.sort_order, 0);

    setSaving(true);
    setErr(null);

    try {
      if (r.id) {
        const up = await supabase.from("alliance_event_types").update(payload).eq("id", r.id).select("id").maybeSingle();
        if (up.error) throw up.error;
        showToast("Saved ✅");
        return;
      }

      const ins = await supabase.from("alliance_event_types").insert(payload).select("id").maybeSingle();
      if (ins.error) throw ins.error;

      const newId = ins.data?.id ? String(ins.data.id) : null;
      if (newId) updateRow(r._localKey, { id: newId, _localKey: newId });
      showToast("Created ✅");
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const saveAll = async () => {
    setSaving(true);
    setErr(null);
    try {
      for (const r of rows) {
        // only save rows with a name
        if (s(r.name)) {
          // eslint-disable-next-line no-await-in-loop
          await saveRow(r);
        }
      }
      showToast("All saved ✅");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🗓️ Owner: Event Types</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/owner" style={{ opacity: 0.85 }}>Owner</Link>
          <Link to="/owner/roles" style={{ opacity: 0.85 }}>Roles</Link>
          <Link to="/me" style={{ opacity: 0.85 }}>ME</Link>
        </div>
      </div>

      {hint ? (
        <div style={{ marginTop: 10, padding: 10, border: "1px solid rgba(0,255,0,0.20)", borderRadius: 10 }}>
          {hint}
        </div>
      ) : null}

      {err ? (
        <div style={{ marginTop: 10, padding: 10, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 10 }}>
          <b>Error:</b> {err}
        </div>
      ) : null}

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ opacity: 0.8 }}>Alliance</span>
          <select value={selectedAlliance} onChange={(e) => setSelectedAlliance(upper(e.target.value))} style={{ padding: 8, borderRadius: 10 }}>
            {alliances.map((a) => (
              <option key={a.code} value={a.code}>
                {a.code}{a.name ? ` — ${a.name}` : ""}
              </option>
            ))}
          </select>
        </label>

        <button onClick={addRow} style={{ padding: "8px 10px", borderRadius: 10 }}>
          + Add type
        </button>

        <button onClick={saveAll} disabled={saving} style={{ padding: "8px 10px", borderRadius: 10, fontWeight: 800 }}>
          Save all
        </button>

        {saving ? <span style={{ opacity: 0.75 }}>Saving…</span> : null}
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
        This page is additive-only. Calendar will try to load these types; if anything fails, it falls back to the built-in list.
      </div>

      <div style={{ marginTop: 14, border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 0.8fr 0.8fr 1.2fr", gap: 0, padding: 10, fontWeight: 900, borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
          <div>Name</div>
          <div>Category</div>
          <div>Enabled</div>
          <div>Sort</div>
          <div>Actions</div>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: 12, opacity: 0.8 }}>No event types yet for this alliance.</div>
        ) : (
          rows
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((r) => (
              <div key={r._localKey} style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 0.8fr 0.8fr 1.2fr", padding: 10, gap: 10, alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <input
                  value={r.name}
                  onChange={(e) => updateRow(r._localKey, { name: e.target.value })}
                  placeholder="e.g. Hunt Mastery"
                  style={{ padding: 10, borderRadius: 10 }}
                />

                <select
                  value={r.category}
                  onChange={(e) => updateRow(r._localKey, { category: e.target.value })}
                  style={{ padding: 10, borderRadius: 10 }}
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={r.enabled}
                    onChange={(e) => updateRow(r._localKey, { enabled: e.target.checked })}
                  />
                  <span style={{ opacity: 0.8, fontSize: 12 }}>On</span>
                </label>

                <input
                  type="number"
                  value={r.sort_order}
                  onChange={(e) => updateRow(r._localKey, { sort_order: Number(e.target.value) })}
                  style={{ padding: 10, borderRadius: 10 }}
                />

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => saveRow(r)} disabled={saving} style={{ padding: "8px 10px", borderRadius: 10, fontWeight: 800 }}>
                    Save
                  </button>
                  <button onClick={() => removeRow(r)} disabled={saving} style={{ padding: "8px 10px", borderRadius: 10 }}>
                    Delete
                  </button>
                </div>
              </div>
            ))
        )}
      </div>

      {tableCols.length ? (
        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
          Detected columns: <code>{tableCols.join(", ")}</code>
        </div>
      ) : null}
    </div>
  );
}
