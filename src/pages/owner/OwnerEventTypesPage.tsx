import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type AllianceRow = { code: string; name: string | null };

type EventTypeRow = {
  id: string;
  alliance_code: string;
  category: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

const DEFAULT_SEED = [
  "State vs. State",
  "Reminder",
  "Sonic",
  "Dead Rising",
  "Defense of Alliance",
  "Wasteland King",
  "Valiance Conquest",
  "Tundra",
  "Alliance Clash",
  "Alliance Showdown",
  "FireFlies",
];

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function toInt(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export default function OwnerEventTypesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const [alliances, setAlliances] = useState<AllianceRow[]>([]);
  const [allianceCode, setAllianceCode] = useState<string>("");

  const [rows, setRows] = useState<EventTypeRow[]>([]);

  const [newCategory, setNewCategory] = useState<string>("Alliance Event");
  const [newName, setNewName] = useState<string>("");
  const [newSort, setNewSort] = useState<number>(0);
  const [newActive, setNewActive] = useState<boolean>(true);

  const selectedAllianceName = useMemo(() => {
    const a = alliances.find((x) => upper(x.code) === upper(allianceCode));
    return a?.name ?? null;
  }, [alliances, allianceCode]);

  const loadAlliances = async () => {
    const a = await supabase.from("alliances").select("code,name").order("code", { ascending: true });
    if (a.error) throw a.error;

    const list = (a.data ?? []).map((r: any) => ({
      code: upper(r.code),
      name: r.name ?? null,
    })) as AllianceRow[];

    setAlliances(list);
    if (!allianceCode && list.length > 0) setAllianceCode(list[0].code);
  };

  const loadTypes = async (code: string) => {
    if (!code) { setRows([]); return; }

    const res = await supabase
      .from("alliance_event_types")
      .select("id,alliance_code,category,name,sort_order,is_active")
      .eq("alliance_code", upper(code))
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (res.error) throw res.error;
    setRows((res.data ?? []) as any);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);

      try {
        await loadAlliances();
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        await loadTypes(allianceCode);
      } catch (e: any) {
        setErr(e?.message ?? String(e));
      }
    })();
  }, [allianceCode]);

  const flash = (msg: string) => {
    setHint(msg);
    setTimeout(() => setHint(null), 1200);
  };

  const insertType = async () => {
    const name = newName.trim();
    if (!name) return alert("Name required.");
    if (!allianceCode) return alert("Select an alliance.");

    setSaving(true);
    setErr(null);
    try {
      const payload: any = {
        alliance_code: upper(allianceCode),
        category: (newCategory || "Alliance Event").trim(),
        name,
        sort_order: toInt(newSort, 0),
        is_active: !!newActive,
      };

      const ins = await supabase.from("alliance_event_types").insert(payload);
      if (ins.error) throw ins.error;

      setNewName("");
      setNewSort(0);
      setNewActive(true);

      flash("Added ✅");
      await loadTypes(allianceCode);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const updateType = async (id: string, patch: Partial<EventTypeRow>) => {
    setSaving(true);
    setErr(null);
    try {
      const up = await supabase
        .from("alliance_event_types")
        .update({ ...patch, updated_at: new Date().toISOString() } as any)
        .eq("id", id);

      if (up.error) throw up.error;

      flash("Saved ✅");
      await loadTypes(allianceCode);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const deleteType = async (id: string) => {
    if (!confirm("Delete this event type?")) return;

    setSaving(true);
    setErr(null);
    try {
      const del = await supabase.from("alliance_event_types").delete().eq("id", id);
      if (del.error) throw del.error;

      flash("Deleted ✅");
      await loadTypes(allianceCode);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const seedDefaults = async () => {
    if (!allianceCode) return;
    setSaving(true);
    setErr(null);
    try {
      for (let i = 0; i < DEFAULT_SEED.length; i++) {
        const payload: any = {
          alliance_code: upper(allianceCode),
          category: "State Event",
          name: DEFAULT_SEED[i],
          sort_order: i,
          is_active: true,
        };
        const ins = await supabase.from("alliance_event_types").insert(payload);
        if (ins.error) {
          const msg = String(ins.error.message ?? "").toLowerCase();
          if (!msg.includes("duplicate") && !msg.includes("unique")) throw ins.error;
        }
      }
      flash("Seeded ✅");
      await loadTypes(allianceCode);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🏷️ Owner: Event Types</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {saving ? <span style={{ opacity: 0.8 }}>Saving…</span> : null}
          {hint ? <span style={{ opacity: 0.9 }}>{hint}</span> : null}
        </div>
      </div>

      {err ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 10 }}>
          <b>Error:</b> {err}
        </div>
      ) : null}

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ opacity: 0.8 }}>Alliance</span>
          <select value={allianceCode} onChange={(e) => setAllianceCode(upper(e.target.value))}>
            {alliances.map((a) => (
              <option key={a.code} value={a.code}>
                {a.code}{a.name ? ` — ${a.name}` : ""}
              </option>
            ))}
          </select>
        </label>

        <button onClick={seedDefaults} style={{ padding: "8px 10px", borderRadius: 10 }}>
          Seed defaults
        </button>

        <div style={{ opacity: 0.75, fontSize: 12 }}>
          Calendar dropdown reads from these (per alliance). {selectedAllianceName ? `(${selectedAllianceName})` : ""}
        </div>
      </div>

      <div style={{ marginTop: 14, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 900 }}>➕ Add Event Type</div>

        <div style={{ marginTop: 10, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ opacity: 0.8, fontSize: 12 }}>Category</span>
            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} style={{ padding: 10, borderRadius: 10 }}>
              <option value="Alliance Event">Alliance Event</option>
              <option value="State Event">State Event</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ opacity: 0.8, fontSize: 12 }}>Name</span>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Hunt Mastery" style={{ padding: 10, borderRadius: 10 }} />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ opacity: 0.8, fontSize: 12 }}>Sort Order</span>
            <input type="number" value={newSort} onChange={(e) => setNewSort(toInt(e.target.value, 0))} style={{ padding: 10, borderRadius: 10 }} />
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 22 }}>
            <input type="checkbox" checked={newActive} onChange={(e) => setNewActive(e.target.checked)} />
            <span style={{ opacity: 0.85 }}>Active</span>
          </label>
        </div>

        <div style={{ marginTop: 10 }}>
          <button onClick={insertType} style={{ padding: "8px 10px", borderRadius: 10, fontWeight: 900 }}>
            Add
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 900 }}>📋 Existing</div>

        {rows.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>
            No event types yet. Add some or seed defaults.
          </div>
        ) : (
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {rows.map((r) => (
              <div key={r.id} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 12 }}>
                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", alignItems: "end" }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ opacity: 0.8, fontSize: 12 }}>Category</span>
                    <input
                      defaultValue={r.category}
                      onBlur={(e) => updateType(r.id, { category: e.target.value })}
                      style={{ padding: 10, borderRadius: 10 }}
                    />
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ opacity: 0.8, fontSize: 12 }}>Name</span>
                    <input
                      defaultValue={r.name}
                      onBlur={(e) => updateType(r.id, { name: e.target.value })}
                      style={{ padding: 10, borderRadius: 10, fontWeight: 800 }}
                    />
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ opacity: 0.8, fontSize: 12 }}>Sort</span>
                    <input
                      type="number"
                      defaultValue={r.sort_order}
                      onBlur={(e) => updateType(r.id, { sort_order: toInt(e.target.value, 0) })}
                      style={{ padding: 10, borderRadius: 10 }}
                    />
                  </label>

                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      defaultChecked={!!r.is_active}
                      onChange={(e) => updateType(r.id, { is_active: e.target.checked })}
                    />
                    <span style={{ opacity: 0.85 }}>Active</span>
                  </label>

                  <button onClick={() => deleteType(r.id)} style={{ padding: "8px 10px", borderRadius: 10 }}>
                    Delete
                  </button>
                </div>

                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                  Calendar dropdown shows <b>Active</b> types only.
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
