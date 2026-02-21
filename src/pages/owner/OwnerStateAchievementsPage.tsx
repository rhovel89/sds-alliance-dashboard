import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

function nowUtc() { return new Date().toISOString(); }
function norm(s: any) { return String(s || "").trim(); }
function normLower(s: any) { return String(s || "").trim().toLowerCase(); }
function asBool(v: any, fallback: boolean) {
  if (typeof v === "boolean") return v;
  if (v === 1 || v === "1" || v === "true") return true;
  if (v === 0 || v === "0" || v === "false") return false;
  return fallback;
}
function asInt(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

type AnyRow = Record<string, any>;

export default function OwnerStateAchievementsPage() {
  const stateCode = "789";

  const [tab, setTab] = useState<"requests"|"types"|"options"|"access"|"export">("requests");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [types, setTypes] = useState<AnyRow[]>([]);
  const [options, setOptions] = useState<AnyRow[]>([]);
  const [requests, setRequests] = useState<AnyRow[]>([]);
  const [accessRows, setAccessRows] = useState<AnyRow[]>([]);

  const typeById = useMemo(() => {
    const m: Record<string, AnyRow> = {};
    for (const t of types) if (t?.id) m[String(t.id)] = t;
    return m;
  }, [types]);

  const optionById = useMemo(() => {
    const m: Record<string, AnyRow> = {};
    for (const o of options) if (o?.id) m[String(o.id)] = o;
    return m;
  }, [options]);

  const [filter, setFilter] = useState("");

  async function loadAll() {
    setLoading(true);
    setMsg(null);

    const t = await supabase
      .from("state_achievement_types")
      .select("*")
      .eq("state_code", stateCode)
      .order("name", { ascending: true });

    if (t.error) {
      setTypes([]);
      setOptions([]);
      setRequests([]);
      setAccessRows([]);
      setMsg("Types load failed: " + t.error.message);
      setLoading(false);
      return;
    }
    const tData = (t.data as any[]) || [];
    setTypes(tData);

    const ids = tData.map((x) => x?.id).filter(Boolean);
    if (ids.length) {
      const o = await supabase
        .from("state_achievement_options")
        .select("*")
        .in("achievement_type_id", ids)
        .order("sort", { ascending: true })
        .order("label", { ascending: true });

      if (o.error) {
        setOptions([]);
        setMsg((prev) => (prev ? prev + " | " : "") + "Options load failed: " + o.error.message);
      } else {
        setOptions((o.data as any[]) || []);
      }
    } else {
      setOptions([]);
    }

    const r = await supabase
      .from("state_achievement_requests")
      .select("*")
      .eq("state_code", stateCode)
      .order("created_at", { ascending: false });

    if (r.error) {
      setRequests([]);
      setMsg((prev) => (prev ? prev + " | " : "") + "Requests load failed: " + r.error.message);
    } else {
      setRequests((r.data as any[]) || []);
    }

    const a = await supabase
      .from("state_achievement_access")
      .select("*")
      .eq("state_code", stateCode)
      .order("created_at", { ascending: false });

    if (a.error) {
      setAccessRows([]);
      setMsg((prev) => (prev ? prev + " | " : "") + "Access load failed: " + a.error.message);
    } else {
      setAccessRows((a.data as any[]) || []);
    }

    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  // ----------------------------
  // Requests actions
  // ----------------------------
  async function saveRequest(row: AnyRow) {
    setMsg(null);

    const id = row?.id;
    if (!id) return;

    const reqCount = asInt(row.required_count ?? typeById[String(row.achievement_type_id)]?.required_count ?? 1, 1);
    const curCount = Math.max(0, asInt(row.current_count ?? 0, 0));
    const statusRaw = String(row.status || "submitted");
    const done = (statusRaw === "completed") || (curCount >= reqCount);

    const patch: any = {
      status: done ? "completed" : statusRaw,
      current_count: curCount,
      notes: row.notes ?? null
    };

    // set completed_at if the column exists and it's being completed
    if (done && (row.completed_at == null)) patch.completed_at = nowUtc();

    const u = await supabase.from("state_achievement_requests").update(patch).eq("id", id);
    if (u.error) {
      setMsg("Update failed: " + u.error.message);
      return;
    }
    setMsg("✅ Updated request.");
    await loadAll();
  }

  // ----------------------------
  // Types CRUD
  // ----------------------------
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeKind, setNewTypeKind] = useState("swp_weapon");
  const [newTypeRequiresOption, setNewTypeRequiresOption] = useState(true);
  const [newTypeRequiredCount, setNewTypeRequiredCount] = useState(1);

  async function addType() {
    setMsg(null);
    const name = norm(newTypeName);
    if (!name) return setMsg("Type name is required.");

    const payload: any = {
      state_code: stateCode,
      name,
      kind: norm(newTypeKind) || null,
      requires_option: !!newTypeRequiresOption,
      required_count: Math.max(1, asInt(newTypeRequiredCount, 1)),
      active: true
    };

    const ins = await supabase.from("state_achievement_types").insert(payload).select("id").maybeSingle();
    if (ins.error) return setMsg("Add type failed: " + ins.error.message);

    setNewTypeName("");
    setMsg("✅ Type added.");
    await loadAll();
  }

  async function toggleTypeActive(t: AnyRow) {
    setMsg(null);
    const id = t?.id; if (!id) return;
    const next = !asBool(t.active, true);
    const u = await supabase.from("state_achievement_types").update({ active: next }).eq("id", id);
    if (u.error) return setMsg("Toggle failed: " + u.error.message);
    await loadAll();
  }

  async function saveType(t: AnyRow) {
    setMsg(null);
    const id = t?.id; if (!id) return;
    const patch: any = {
      name: t.name ?? null,
      kind: t.kind ?? null,
      requires_option: !!t.requires_option,
      required_count: Math.max(1, asInt(t.required_count, 1))
    };
    const u = await supabase.from("state_achievement_types").update(patch).eq("id", id);
    if (u.error) return setMsg("Save failed: " + u.error.message);
    setMsg("✅ Type saved.");
    await loadAll();
  }

  async function hardDeleteType(t: AnyRow) {
    if (!confirm("Hard delete this type? (This may fail if rows reference it.)")) return;
    setMsg(null);
    const id = t?.id; if (!id) return;
    const d = await supabase.from("state_achievement_types").delete().eq("id", id);
    if (d.error) return setMsg("Delete failed: " + d.error.message);
    setMsg("✅ Deleted type.");
    await loadAll();
  }

  // ----------------------------
  // Options CRUD
  // ----------------------------
  const [optTypeId, setOptTypeId] = useState<string>("");
  const [newOptLabel, setNewOptLabel] = useState("Rail Gun");
  const [newOptSort, setNewOptSort] = useState(10);

  async function addOption() {
    setMsg(null);
    const tid = optTypeId || (types[0]?.id ? String(types[0].id) : "");
    if (!tid) return setMsg("Select a type first.");
    const label = norm(newOptLabel).replace(/^#/, "");
    if (!label) return setMsg("Option label is required.");

    const payload: any = {
      achievement_type_id: tid,
      label,
      sort: asInt(newOptSort, 10),
      active: true
    };

    const ins = await supabase.from("state_achievement_options").insert(payload).select("id").maybeSingle();
    if (ins.error) return setMsg("Add option failed: " + ins.error.message);

    setNewOptLabel("");
    setMsg("✅ Option added.");
    await loadAll();
  }

  async function toggleOptionActive(o: AnyRow) {
    setMsg(null);
    const id = o?.id; if (!id) return;
    const next = !asBool(o.active, true);
    const u = await supabase.from("state_achievement_options").update({ active: next }).eq("id", id);
    if (u.error) return setMsg("Toggle failed: " + u.error.message);
    await loadAll();
  }

  async function saveOption(o: AnyRow) {
    setMsg(null);
    const id = o?.id; if (!id) return;
    const patch: any = {
      label: o.label ?? null,
      sort: asInt(o.sort, 0)
    };
    const u = await supabase.from("state_achievement_options").update(patch).eq("id", id);
    if (u.error) return setMsg("Save failed: " + u.error.message);
    setMsg("✅ Option saved.");
    await loadAll();
  }

  async function hardDeleteOption(o: AnyRow) {
    if (!confirm("Hard delete this option?")) return;
    setMsg(null);
    const id = o?.id; if (!id) return;
    const d = await supabase.from("state_achievement_options").delete().eq("id", id);
    if (d.error) return setMsg("Delete failed: " + d.error.message);
    setMsg("✅ Deleted option.");
    await loadAll();
  }

  // ----------------------------
  // Access CRUD
  // ----------------------------
  const [accessUserId, setAccessUserId] = useState("");
  const [accView, setAccView] = useState(true);
  const [accEdit, setAccEdit] = useState(false);
  const [accManageTypes, setAccManageTypes] = useState(false);

  async function upsertAccess() {
    setMsg(null);
    const uid = norm(accessUserId);
    if (!uid) return setMsg("User ID is required.");

    const payload: any = {
      state_code: stateCode,
      user_id: uid,
      can_view: !!accView,
      can_edit: !!accEdit,
      can_manage_types: !!accManageTypes
    };

    // Use upsert; if no unique constraint exists, Supabase may error -> we show it.
    const up = await supabase.from("state_achievement_access").upsert(payload as any).select("*");
    if (up.error) return setMsg("Upsert failed: " + up.error.message);

    setMsg("✅ Access saved.");
    await loadAll();
  }

  async function deleteAccess(row: AnyRow) {
    if (!confirm("Delete access row?")) return;
    setMsg(null);
    const id = row?.id;
    if (id) {
      const d = await supabase.from("state_achievement_access").delete().eq("id", id);
      if (d.error) return setMsg("Delete failed: " + d.error.message);
    } else {
      // fallback
      const d = await supabase.from("state_achievement_access").delete().eq("state_code", stateCode).eq("user_id", row.user_id);
      if (d.error) return setMsg("Delete failed: " + d.error.message);
    }
    setMsg("✅ Access deleted.");
    await loadAll();
  }

  // ----------------------------
  // Export/Import + Seed
  // ----------------------------
  async function copyExport() {
    const payload = {
      version: 1,
      exportedUtc: nowUtc(),
      state_code: stateCode,
      types,
      options
    };
    const txt = JSON.stringify(payload, null, 2);
    try { await navigator.clipboard.writeText(txt); setMsg("✅ Copied export JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  async function importJson() {
    const raw = window.prompt("Paste export JSON:");
    if (!raw) return;
    setMsg(null);
    try {
      const p = JSON.parse(raw);
      const tArr: any[] = Array.isArray(p?.types) ? p.types : [];
      const oArr: any[] = Array.isArray(p?.options) ? p.options : [];

      // Import strategy: upsert by id if present, else insert.
      // (If your DB doesn't allow upsert, errors will be shown.)
      if (tArr.length) {
        const upT = await supabase.from("state_achievement_types").upsert(tArr as any);
        if (upT.error) return setMsg("Import types failed: " + upT.error.message);
      }
      if (oArr.length) {
        const upO = await supabase.from("state_achievement_options").upsert(oArr as any);
        if (upO.error) return setMsg("Import options failed: " + upO.error.message);
      }

      setMsg("✅ Imported.");
      await loadAll();
    } catch {
      setMsg("Invalid JSON.");
    }
  }

  async function seedDefaults() {
    setMsg(null);

    // 1) Ensure SWP Weapon type exists (requires option)
    const hasSwp = types.some((t) => normLower(t.name) === "swp weapon" || normLower(t.kind) === "swp_weapon");
    const hasGov = types.some((t) => normLower(t.name).includes("governor") || normLower(t.kind) === "governor_count");

    let swpId: string | null = null;

    if (!hasSwp) {
      const ins = await supabase.from("state_achievement_types").insert({
        state_code: stateCode,
        name: "SWP Weapon",
        kind: "swp_weapon",
        requires_option: true,
        required_count: 1,
        active: true
      } as any).select("id").maybeSingle();

      if (ins.error) return setMsg("Seed SWP type failed: " + ins.error.message);
      swpId = (ins.data as any)?.id ? String((ins.data as any).id) : null;
    } else {
      // try to locate id to seed option
      const t = types.find((x) => normLower(x.kind) === "swp_weapon" || normLower(x.name) === "swp weapon");
      swpId = t?.id ? String(t.id) : null;
    }

    if (!hasGov) {
      const ins2 = await supabase.from("state_achievement_types").insert({
        state_code: stateCode,
        name: "Governor Rotations",
        kind: "governor_count",
        requires_option: false,
        required_count: 3,
        active: true
      } as any).select("id").maybeSingle();

      if (ins2.error) return setMsg("Seed Governor type failed: " + ins2.error.message);
    }

    // 2) Ensure Rail Gun option exists under SWP
    if (swpId) {
      const railExists = options.some((o) => String(o.achievement_type_id) === swpId && normLower(o.label) === "rail gun");
      if (!railExists) {
        const ins3 = await supabase.from("state_achievement_options").insert({
          achievement_type_id: swpId,
          label: "Rail Gun",
          sort: 10,
          active: true
        } as any).select("id").maybeSingle();

        if (ins3.error) return setMsg("Seed Rail Gun failed: " + ins3.error.message);
      }
    }

    setMsg("✅ Seeded defaults (SWP Weapon + Rail Gun, Governor Rotations 3x).");
    await loadAll();
  }

  // ----------------------------
  // Render helpers
  // ----------------------------
  const filteredRequests = useMemo(() => {
    const s = normLower(filter);
    if (!s) return requests;
    return requests.filter((r) => {
      const t = typeById[String(r.achievement_type_id)]?.name || "";
      const o = r.option_id ? (optionById[String(r.option_id)]?.label || "") : "";
      return (
        normLower(r.player_name).includes(s) ||
        normLower(r.alliance_name).includes(s) ||
        normLower(t).includes(s) ||
        normLower(o).includes(s) ||
        normLower(r.status).includes(s)
      );
    });
  }, [filter, requests, typeById, optionById]);

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🧟 Owner — State Achievements</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => window.location.assign("/state/789/achievements")}>
            Open Player Form
          </button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={loadAll}>Refresh</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: tab==="requests" ? 900 : 700 }} onClick={() => setTab("requests")}>Requests</button>
          <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: tab==="types" ? 900 : 700 }} onClick={() => setTab("types")}>Types</button>
          <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: tab==="options" ? 900 : 700 }} onClick={() => setTab("options")}>Options</button>
          <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: tab==="access" ? 900 : 700 }} onClick={() => setTab("access")}>Access</button>
          <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: tab==="export" ? 900 : 700 }} onClick={() => setTab("export")}>Export/Import</button>

          <div style={{ marginLeft: "auto", opacity: 0.75, fontSize: 12 }}>
            {loading ? "Loading…" : `Types: ${types.length} • Options: ${options.length} • Requests: ${requests.length}`}
          </div>
        </div>

        {msg ? <div style={{ marginTop: 10, opacity: 0.9 }}>{msg}</div> : null}
      </div>

      {tab === "requests" ? (
        <div className="zombie-card" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontWeight: 900 }}>Submitted Forms</div>
            <input className="zombie-input" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search…" style={{ padding: "10px 12px", minWidth: 280 }} />
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {filteredRequests.map((r) => {
              const t = typeById[String(r.achievement_type_id)];
              const o = r.option_id ? optionById[String(r.option_id)] : null;

              const req = asInt(r.required_count ?? t?.required_count ?? 1, 1);
              const cur = asInt(r.current_count ?? 0, 0);
              const done = (String(r.status) === "completed") || (cur >= req);

              return (
                <div key={String(r.id)} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ fontWeight: 900 }}>{r.player_name} <span style={{ opacity: 0.7 }}>({r.alliance_name})</span></div>
                    <div style={{ marginLeft: "auto", fontWeight: 900 }}>{cur}/{req}{done ? " ✅" : ""}</div>
                  </div>

                  <div style={{ opacity: 0.85, marginTop: 6 }}>
                    {(t?.name || "Achievement")}{o ? (" — " + o.label) : ""}
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>Count</div>
                    <input
                      className="zombie-input"
                      value={String(r.current_count ?? 0)}
                      onChange={(e) => {
                        const v = Math.max(0, asInt(e.target.value, 0));
                        setRequests((prev) => prev.map((x) => x.id === r.id ? { ...x, current_count: v } : x));
                      }}
                      style={{ padding: "8px 10px", width: 90 }}
                    />

                    <div style={{ opacity: 0.75, fontSize: 12 }}>Status</div>
                    <select
                      className="zombie-input"
                      value={String(r.status || "submitted")}
                      onChange={(e) => setRequests((prev) => prev.map((x) => x.id === r.id ? { ...x, status: e.target.value } : x))}
                      style={{ padding: "8px 10px" }}
                    >
                      <option value="submitted">submitted</option>
                      <option value="in_progress">in_progress</option>
                      <option value="completed">completed</option>
                      <option value="denied">denied</option>
                    </select>

                    <button className="zombie-btn" style={{ padding: "8px 10px", fontWeight: 900 }} onClick={() => saveRequest(r)}>Save</button>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <textarea
                      className="zombie-input"
                      value={String(r.notes || "")}
                      onChange={(e) => setRequests((prev) => prev.map((x) => x.id === r.id ? { ...x, notes: e.target.value } : x))}
                      placeholder="Notes"
                      style={{ padding: "10px 12px", width: "100%", minHeight: 70 }}
                    />
                  </div>

                  <div style={{ opacity: 0.6, fontSize: 12, marginTop: 8 }}>
                    Created: {String(r.created_at || "—")}
                  </div>
                </div>
              );
            })}
            {!loading && filteredRequests.length === 0 ? <div style={{ opacity: 0.75 }}>No requests found.</div> : null}
          </div>
        </div>
      ) : null}

      {tab === "types" ? (
        <div className="zombie-card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 900 }}>Achievement Types</div>
          <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
            Examples: SWP Weapon (requires option), Governor Rotations (required_count=3).
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10, maxWidth: 720 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontWeight: 900 }}>Add Type</div>
              <input className="zombie-input" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Name (e.g. SWP Weapon)" style={{ padding: "10px 12px" }} />
              <input className="zombie-input" value={newTypeKind} onChange={(e) => setNewTypeKind(e.target.value)} placeholder="Kind (swp_weapon / governor_count)" style={{ padding: "10px 12px" }} />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="checkbox" checked={!!newTypeRequiresOption} onChange={(e) => setNewTypeRequiresOption(e.target.checked)} />
                  requires option (weapon dropdown)
                </label>
                <div style={{ opacity: 0.75, fontSize: 12 }}>required count</div>
                <input className="zombie-input" value={String(newTypeRequiredCount)} onChange={(e) => setNewTypeRequiredCount(asInt(e.target.value, 1))} style={{ padding: "8px 10px", width: 90 }} />
                <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: 900 }} onClick={addType}>Add</button>
                <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={seedDefaults}>Seed Defaults</button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {types.map((t) => {
              const active = asBool(t.active, true);
              return (
                <div key={String(t.id)} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ fontWeight: 900 }}>{String(t.name || "Untitled")}</div>
                    <div style={{ marginLeft: "auto", opacity: 0.85 }}>{active ? "active" : "inactive"}</div>
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gap: 8, maxWidth: 720 }}>
                    <div>
                      <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Name</div>
                      <input className="zombie-input" value={String(t.name || "")} onChange={(e) => setTypes((prev) => prev.map((x) => x.id === t.id ? { ...x, name: e.target.value } : x))} style={{ padding: "10px 12px", width: "100%" }} />
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Kind</div>
                        <input className="zombie-input" value={String(t.kind || "")} onChange={(e) => setTypes((prev) => prev.map((x) => x.id === t.id ? { ...x, kind: e.target.value } : x))} style={{ padding: "10px 12px", width: "100%" }} />
                      </div>

                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input type="checkbox" checked={!!t.requires_option} onChange={(e) => setTypes((prev) => prev.map((x) => x.id === t.id ? { ...x, requires_option: e.target.checked } : x))} />
                          requires option
                        </label>

                        <div style={{ opacity: 0.75, fontSize: 12 }}>required</div>
                        <input className="zombie-input" value={String(t.required_count ?? 1)} onChange={(e) => setTypes((prev) => prev.map((x) => x.id === t.id ? { ...x, required_count: asInt(e.target.value, 1) } : x))} style={{ padding: "8px 10px", width: 90 }} />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: 900 }} onClick={() => saveType(t)}>Save</button>
                      <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => toggleTypeActive(t)}>{active ? "Deactivate" : "Activate"}</button>
                      <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => hardDeleteType(t)}>Hard Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
            {!loading && types.length === 0 ? <div style={{ opacity: 0.75 }}>No types yet.</div> : null}
          </div>
        </div>
      ) : null}

      {tab === "options" ? (
        <div className="zombie-card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 900 }}>Options (Weapons / Dropdown items)</div>
          <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
            These appear only for types with requires_option=true (e.g. SWP Weapon).
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10, maxWidth: 720 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <select className="zombie-input" value={optTypeId} onChange={(e) => setOptTypeId(e.target.value)} style={{ padding: "10px 12px", minWidth: 260 }}>
                <option value="">Select type…</option>
                {types.map((t) => <option key={String(t.id)} value={String(t.id)}>{String(t.name || t.id)}</option>)}
              </select>
              <input className="zombie-input" value={newOptLabel} onChange={(e) => setNewOptLabel(e.target.value)} placeholder="Label (Rail Gun)" style={{ padding: "10px 12px", flex: 1, minWidth: 220 }} />
              <input className="zombie-input" value={String(newOptSort)} onChange={(e) => setNewOptSort(asInt(e.target.value, 10))} placeholder="Sort" style={{ padding: "10px 12px", width: 90 }} />
              <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: 900 }} onClick={addOption}>Add</button>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {options
              .filter((o) => !optTypeId || String(o.achievement_type_id) === String(optTypeId))
              .map((o) => {
                const active = asBool(o.active, true);
                const t = typeById[String(o.achievement_type_id)];
                return (
                  <div key={String(o.id)} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <div style={{ fontWeight: 900 }}>#{String(o.label || "Option")}</div>
                      <div style={{ opacity: 0.75, fontSize: 12 }}>Type: {String(t?.name || o.achievement_type_id)}</div>
                      <div style={{ marginLeft: "auto", opacity: 0.85 }}>{active ? "active" : "inactive"}</div>
                    </div>

                    <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <input className="zombie-input" value={String(o.label || "")} onChange={(e) => setOptions((prev) => prev.map((x) => x.id === o.id ? { ...x, label: e.target.value } : x))} style={{ padding: "10px 12px", minWidth: 240 }} />
                      <input className="zombie-input" value={String(o.sort ?? 0)} onChange={(e) => setOptions((prev) => prev.map((x) => x.id === o.id ? { ...x, sort: asInt(e.target.value, 0) } : x))} style={{ padding: "10px 12px", width: 90 }} />
                      <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: 900 }} onClick={() => saveOption(o)}>Save</button>
                      <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => toggleOptionActive(o)}>{active ? "Deactivate" : "Activate"}</button>
                      <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => hardDeleteOption(o)}>Hard Delete</button>
                    </div>
                  </div>
                );
              })}
            {!loading && options.length === 0 ? <div style={{ opacity: 0.75 }}>No options yet.</div> : null}
          </div>
        </div>
      ) : null}

      {tab === "access" ? (
        <div className="zombie-card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 900 }}>Access (Helpers)</div>
          <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
            Grant view/edit for the tracker page: /state/789/achievements-tracker
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10, maxWidth: 720 }}>
            <div style={{ fontWeight: 900 }}>Add/Update Access</div>
            <input className="zombie-input" value={accessUserId} onChange={(e) => setAccessUserId(e.target.value)} placeholder="User ID (uuid)" style={{ padding: "10px 12px" }} />
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={!!accView} onChange={(e) => setAccView(e.target.checked)} />
                can_view
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={!!accEdit} onChange={(e) => setAccEdit(e.target.checked)} />
                can_edit
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={!!accManageTypes} onChange={(e) => setAccManageTypes(e.target.checked)} />
                can_manage_types
              </label>
              <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: 900 }} onClick={upsertAccess}>Save Access</button>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {accessRows.map((a) => (
              <div key={String(a.id || (a.user_id || ""))} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                <div style={{ fontWeight: 900 }}>{String(a.user_id || "user")}</div>
                <div style={{ opacity: 0.8, fontSize: 12, marginTop: 6 }}>
                  view={String(!!a.can_view)} • edit={String(!!a.can_edit)} • manage_types={String(!!a.can_manage_types)}
                </div>
                <button className="zombie-btn" style={{ marginTop: 8, padding: "8px 10px" }} onClick={() => deleteAccess(a)}>Delete</button>
              </div>
            ))}
            {!loading && accessRows.length === 0 ? <div style={{ opacity: 0.75 }}>No access rows yet.</div> : null}
          </div>
        </div>
      ) : null}

      {tab === "export" ? (
        <div className="zombie-card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 900 }}>Export / Import</div>
          <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
            Export/import Types + Options JSON (for backup/migration between states later).
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: 900 }} onClick={copyExport}>Copy Export JSON</button>
            <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: 900 }} onClick={importJson}>Import JSON</button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={seedDefaults}>Seed Defaults</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}