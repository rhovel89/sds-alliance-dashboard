import { useLocation, useNavigate } from "react-router-dom";
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";
import StateAchievementsExportPanel from "../../components/state/StateAchievementsExportPanel";
type AnyRow = Record<string, any>;

function nowUtc() { return new Date().toISOString(); }
function norm(s: any) { return String(s || "").trim(); }
function normLower(s: any) { return String(s || "").trim().toLowerCase(); }
function asInt(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

async function safeRpcBool(name: string): Promise<boolean> {
  try {
    const r = await supabase.rpc(name as any);
    if (r.error) return false;
    return r.data === true;
  } catch {
    return false;
  }
}

export default function OwnerStateAchievementsPage() {
  const location = useLocation();
  const [stateCode, setStateCode] = useState("789");
  const [tab, setTab] = useState<"requests" | "types" | "options" | "access" | "export">("requests");

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [isAppAdmin, setIsAppAdmin] = useState(false);
  const [isDashboardOwner, setIsDashboardOwner] = useState(false);

  const [types, setTypes] = useState<AnyRow[]>([]);
  const [options, setOptions] = useState<AnyRow[]>([]);
  const [requests, setRequests] = useState<AnyRow[]>([]);
  const [access, setAccess] = useState<AnyRow[]>([]);
  const initialAllianceFromQuery = useMemo(() => {
    const p = new URLSearchParams(location.search || "");
    return String(p.get("alliance") || "").trim().toUpperCase();
  }, [location.search]);

  const initialTypeFromQuery = useMemo(() => {
    const p = new URLSearchParams(location.search || "");
    return String(p.get("type") || "").trim();
  }, [location.search]);

  const initialPlayerFromQuery = useMemo(() => {
    const p = new URLSearchParams(location.search || "");
    return String(p.get("player") || "").trim();
  }, [location.search]);

  const initialStatusFromQuery = useMemo(() => {
    const p = new URLSearchParams(location.search || "");
    return String(p.get("status") || "").trim().toLowerCase();
  }, [location.search]);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkDiscordAlliance, setBulkDiscordAlliance] = useState("WOC");
  const [bulkDiscordWebhookId, setBulkDiscordWebhookId] = useState("");
  const [bulkDiscordWebhooks, setBulkDiscordWebhooks] = useState<AnyRow[]>([]);
  const [bulkDiscordPreview, setBulkDiscordPreview] = useState("");
  const [bulkDiscordAlliance, setBulkDiscordAlliance] = useState("WOC");
  const [bulkDiscordWebhookId, setBulkDiscordWebhookId] = useState("");
  const [bulkDiscordWebhooks, setBulkDiscordWebhooks] = useState<AnyRow[]>([]);
  const [bulkDiscordPreview, setBulkDiscordPreview] = useState("");

  const typeById = useMemo(() => {
    const m: Record<string, AnyRow> = {};
    for (const t of types) if (t?.id) m[String(t.id)] = t;
    return m;
  }, [types]);

  const optionsByType = useMemo(() => {
    const m: Record<string, AnyRow[]> = {};
    for (const o of options || []) {
      const tid = String(o.achievement_type_id || "");
      if (!tid) continue;
      if (!m[tid]) m[tid] = [];
      m[tid].push(o);
    }
    for (const k of Object.keys(m)) {
      m[k].sort((a, b) => {
        const sa = asInt(a.sort, 0), sb = asInt(b.sort, 0);
        if (sa !== sb) return sa - sb;
        return String(a.label || "").localeCompare(String(b.label || ""));
      });
    }
    return m;
  }, [options]);

  const canAdmin = useMemo(() => !!(isAppAdmin || isDashboardOwner), [isAppAdmin, isDashboardOwner]);

  function reqRequired(r: AnyRow) {
    const t = typeById[String(r.achievement_type_id)] || {};
    return Math.max(1, asInt(r.required_count ?? t.required_count, 1));
  }
  function reqCurrent(r: AnyRow) {
    return Math.max(0, asInt(r.current_count, 0));
  }

  async function loadAll() {
    setLoading(true);
    setMsg(null);

    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id || null;
    setUserId(uid);

    const a = await safeRpcBool("is_app_admin");
    const o = await safeRpcBool("is_dashboard_owner");
    setIsAppAdmin(a);
    setIsDashboardOwner(o);

    const t = await supabase
      .from("state_achievement_types")
      .select("*")
      .eq("state_code", stateCode)
      .order("name", { ascending: true });

    if (t.error) {
      setTypes([]); setOptions([]); setRequests([]); setAccess([]);
      setMsg("Types load failed: " + t.error.message);
      setLoading(false);
      return;
    }
    const tData = (t.data as any[]) || [];
    setTypes(tData);

    const ids = tData.map((x) => x?.id).filter(Boolean);
    if (ids.length) {
      const op = await supabase
        .from("state_achievement_options")
        .select("*")
        .in("achievement_type_id", ids)
        .order("sort", { ascending: true })
        .order("label", { ascending: true });
      if (!op.error) setOptions((op.data as any[]) || []);
      else setOptions([]);
    } else {
      setOptions([]);
    }

    const r = await supabase
      .from("state_achievement_requests")
      .select("*")
      .eq("state_code", stateCode)
      .order("created_at", { ascending: false })
      .limit(800);

    if (!r.error) setRequests((r.data as any[]) || []);
    else {
      setRequests([]);
      setMsg((p) => (p ? p + " | " : "") + "Requests load failed: " + r.error.message);
    }

    const ac = await supabase
      .from("state_achievement_access")
      .select("*")
      .eq("state_code", stateCode)
      .order("created_at", { ascending: false })
      .limit(300);

    if (!ac.error) setAccess((ac.data as any[]) || []);
    else {
      setAccess([]);
      setMsg((p) => (p ? p + " | " : "") + "Access load failed: " + ac.error.message);
    }

    setLoading(false);
  }

  useEffect(() => { loadAll(); }, [stateCode]);

  function setLocalRequests(id: any, patch: AnyRow) {
    setRequests((prev) => prev.map((x) => (String(x.id) === String(id) ? { ...x, ...patch } : x)));
  }

  async function safeUpdateRequest(id: string, patch: AnyRow) {
    // Retry without completed_at if column doesn't exist
    const attempt = async (p: AnyRow) => supabase.from("state_achievement_requests").update(p as any).eq("id", id);

    let res = await attempt(patch);
    if (!res.error) return res;

    const m = (res.error.message || "").toLowerCase();
    if (m.includes("completed_at") && Object.prototype.hasOwnProperty.call(patch, "completed_at")) {
      const p2 = { ...patch };
      delete p2.completed_at;
      res = await attempt(p2);
      return res;
    }
    return res;
  }

  function toggleSelectedRequestId(id: string) {
    const key = String(id || "");
    if (!key) return;
    setSelectedRequestIds((prev) => prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]);
  }

  async function loadBulkDiscordWebhooks(allianceCode: string) {
    try {
      const a = String(allianceCode || "").trim().toUpperCase();
      if (!a) {
        setBulkDiscordWebhooks([]);
        setBulkDiscordWebhookId("");
        return;
      }

      const r = await supabase
        .from("alliance_discord_webhooks")
        .select("id, alliance_code, label, active")
        .eq("alliance_code", a)
        .eq("active", true)
        .order("label", { ascending: true });

      if (r.error) throw r.error;

      const rows = (r.data || []) as AnyRow[];
      setBulkDiscordWebhooks(rows);

      if (!rows.some((x) => String(x?.id || "") === String(bulkDiscordWebhookId || ""))) {
        setBulkDiscordWebhookId(rows.length ? String(rows[0]?.id || "") : "");
      }
    } catch {
      setBulkDiscordWebhooks([]);
      setBulkDiscordWebhookId("");
    }
  }

  function clearSelectedRequests() {
    setSelectedRequestIds([]);
  }

  useEffect(() => {
    void loadBulkDiscordWebhooks(bulkDiscordAlliance);
  }, [bulkDiscordAlliance]);

  function selectAllVisibleRequests() {
    const ids = requests.slice(0, 200).map((r) => String(r?.id || "")).filter(Boolean);
    setSelectedRequestIds(ids);
  }

  async function bulkSetRequestStatus(nextStatus: string) {
    try {
      const ids = selectedRequestIds.slice();
      if (!ids.length) {
        setMsg("Select at least one request first.");
        return;
      }

      if (!window.confirm(`Apply "${nextStatus}" to ${ids.length} selected requests?`)) return;

      setBulkBusy(true);
      setMsg(`Updating ${ids.length} requests...`);

      for (const id of ids) {
        const row = requests.find((x) => String(x?.id || "") === String(id));
        if (!row) continue;

        const req = reqRequired(row);
        const patch: AnyRow = {
          status: nextStatus,
        };

        if (String(nextStatus).toLowerCase() === "completed") {
          patch.current_count = req;
          patch.completed_at = nowUtc();
        }

        await safeUpdateRequest(String(id), patch);
      }

      setSelectedRequestIds([]);
      setMsg(`Bulk update complete ✅ (${ids.length})`);
      await loadAll();
    } catch (e: any) {
      setMsg("Bulk update failed: " + String(e?.message || e || "unknown error"));
    } finally {
      setBulkBusy(false);
    }
  }

  function formatBulkDiscordAchievementLine(r: AnyRow) {
    const player = String(r?.player_name || "Player");
    const alliance = String(r?.alliance_name || r?.alliance_code || "—");
    const type = String(typeName(r?.achievement_type_id) || "Achievement");
    const option = r?.option_id ? String(optionLabel(r?.option_id) || "") : "";
    const status = String(r?.status || "submitted");
    const req = reqRequired(r);
    const cur = reqCurrent(r);

    return `• ${player} — ${type}${option ? ` — ${option}` : ""} (${cur}/${req}, ${status}, ${alliance})`;
  }

  async function previewBulkSendSelectedToDiscord() {
    try {
      const ids = selectedRequestIds.slice();
      if (!ids.length) {
        setMsg("Select at least one request first.");
        return;
      }

      const selected = requests.filter((r) => ids.includes(String(r?.id || "")));
      if (!selected.length) {
        setMsg("No selected requests found.");
        return;
      }

      const alliance = String(bulkDiscordAlliance || "WOC").trim().toUpperCase();
      const submitted = selected.filter((r) => String(r?.status || "").toLowerCase() === "submitted");
      const inProgress = selected.filter((r) => String(r?.status || "").toLowerCase() === "in_progress");
      const completed = selected.filter((r) => String(r?.status || "").toLowerCase() === "completed");

      const parts: string[] = [
        `🩸 **State ${stateCode} — Selected Achievements**`,
        `Alliance: **${alliance}**`,
        `Selected Rows: **${selected.length}** • Submitted: **${submitted.length}** • In Progress: **${inProgress.length}** • Completed: **${completed.length}**`,
      ];

      if (completed.length) parts.push("", "✅ **Completed**", ...completed.slice(0, 10).map((r) => formatBulkDiscordAchievementLine(r)));
      if (inProgress.length) parts.push("", "🧬 **In Progress**", ...inProgress.slice(0, 10).map((r) => formatBulkDiscordAchievementLine(r)));
      if (submitted.length) parts.push("", "⏳ **Submitted**", ...submitted.slice(0, 10).map((r) => formatBulkDiscordAchievementLine(r)));

      setBulkDiscordPreview(parts.join("\n"));
      setMsg("Preview ready ✅");
    } catch (e: any) {
      setMsg("Preview failed: " + String(e?.message || e || "unknown error"));
    }
  }

  async function bulkSendSelectedToDiscord() {
    try {
      const ids = selectedRequestIds.slice();
      if (!ids.length) {
        setMsg("Select at least one request first.");
        return;
      }

      const alliance = String(bulkDiscordAlliance || "").trim().toUpperCase();
      if (!alliance) {
        setMsg("Pick an alliance target first.");
        return;
      }

      const selected = requests.filter((r) => ids.includes(String(r?.id || "")));
      if (!selected.length) {
        setMsg("No selected requests found.");
        return;
      }

      if (!bulkDiscordPreview.trim()) {
        await previewBulkSendSelectedToDiscord();
        return;
      }

      if (!window.confirm(`Queue Discord send for ${selected.length} selected rows to ${alliance}?`)) return;

      setBulkBusy(true);
      setMsg("Queueing selected requests to Discord...");

      const q = await supabase.rpc("queue_discord_send" as any, {
        p_kind: "discord_webhook",
        p_target: "alliance:" + alliance,
        p_channel_id: String(bulkDiscordWebhookId || "default:achievements"),
        p_content: bulkDiscordPreview,
        p_meta: {
          kind: "achievements_bulk_selected",
          source: "OwnerStateAchievementsPage",
          state_code: stateCode,
          alliance_code: alliance,
          webhook_id: String(bulkDiscordWebhookId || ""),
          selected_ids: selected.map((r) => String(r?.id || "")),
        },
      });

      if (q.error) throw q.error;

      setMsg(`Selected requests queued to Discord ✅ (${selected.length})`);
      setBulkDiscordPreview("");
    } catch (e: any) {
      setMsg("Bulk Discord send failed: " + String(e?.message || e || "unknown error"));
    } finally {
      setBulkBusy(false);
    }
  }

  async function saveRequestRow(r: AnyRow) {
    if (!canAdmin) return;
    setMsg(null);

    const id = String(r.id || "");
    if (!id) return;

    const req = reqRequired(r);
    const cur = reqCurrent(r);
    const status = String(r.status || "submitted");
    const done = (status === "completed") || (cur >= req);

    const patch: AnyRow = {
      current_count: cur,
      status: done ? "completed" : status,
      notes: r.notes ?? null
    };
    if (done && (r.completed_at == null)) patch.completed_at = nowUtc();

    const u = await safeUpdateRequest(id, patch);
    if (u.error) {
      setMsg("Update failed: " + u.error.message);
      return;
    }
    setMsg("✅ Request updated.");
    await loadAll();
  }

  // ---- Types CRUD ----
  const [editType, setEditType] = useState<AnyRow | null>(null);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeKind, setNewTypeKind] = useState("count");
  const [newTypeReqCount, setNewTypeReqCount] = useState("1");
  const [newTypeRequiresOption, setNewTypeRequiresOption] = useState(false);

  async function createType() {
    if (!canAdmin) return;
    setMsg(null);

    const name = norm(newTypeName);
    if (!name) return setMsg("Type name required.");

    const payload: AnyRow = {
      state_code: stateCode,
      name,
      kind: norm(newTypeKind) || "count",
      requires_option: !!newTypeRequiresOption,
      required_count: Math.max(1, asInt(newTypeReqCount, 1)),
      active: true
    };

    const ins = await supabase.from("state_achievement_types").insert(payload as any).select("*").maybeSingle();
    if (ins.error) return setMsg("Create type failed: " + ins.error.message);

    setNewTypeName("");
    setMsg("✅ Type created.");
    await loadAll();
  }

  async function saveType(t: AnyRow) {
    if (!canAdmin) return;
    setMsg(null);

    const id = String(t.id || "");
    if (!id) return;

    const patch: AnyRow = {
      name: norm(t.name),
      kind: norm(t.kind) || "count",
      requires_option: t.requires_option === true,
      required_count: Math.max(1, asInt(t.required_count, 1)),
      active: t.active === true
    };

    const up = await supabase.from("state_achievement_types").update(patch as any).eq("id", id);
    if (up.error) return setMsg("Update type failed: " + up.error.message);

    setMsg("✅ Type updated.");
    await loadAll();
  }

  async function disableType(id: string) {
    if (!canAdmin) return;
    if (!window.confirm("Disable this type? (safer than delete)")) return;
    const up = await supabase.from("state_achievement_types").update({ active: false } as any).eq("id", id);
    if (up.error) return setMsg("Disable failed: " + up.error.message);
    setMsg("✅ Disabled.");
    await loadAll();
  }

  // ---- Options CRUD ----
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [newOptLabel, setNewOptLabel] = useState("");
  const [newOptSort, setNewOptSort] = useState("0");

  useEffect(() => {
    if (!selectedTypeId && types.length) setSelectedTypeId(String(types[0].id));
  }, [types, selectedTypeId]);

  async function createOption() {
    if (!canAdmin) return;
    setMsg(null);

    const tid = String(selectedTypeId || "");
    if (!tid) return setMsg("Pick a type first.");

    const label = norm(newOptLabel).replace(/^#/, "");
    if (!label) return setMsg("Option label required (ex: Rail Gun).");

    const payload: AnyRow = {
      achievement_type_id: tid,
      label,
      sort: asInt(newOptSort, 0),
      active: true
    };

    const ins = await supabase.from("state_achievement_options").insert(payload as any).select("*").maybeSingle();
    if (ins.error) return setMsg("Create option failed: " + ins.error.message);

    setNewOptLabel("");
    setMsg("✅ Option created.");
    await loadAll();
  }

  async function saveOption(o: AnyRow) {
    if (!canAdmin) return;
    setMsg(null);

    const id = String(o.id || "");
    if (!id) return;

    const patch: AnyRow = {
      label: norm(o.label),
      sort: asInt(o.sort, 0),
      active: o.active === true
    };

    const up = await supabase.from("state_achievement_options").update(patch as any).eq("id", id);
    if (up.error) return setMsg("Update option failed: " + up.error.message);

    setMsg("✅ Option updated.");
    await loadAll();
  }

  async function disableOption(id: string) {
    if (!canAdmin) return;
    if (!window.confirm("Disable this option? (safer than delete)")) return;
    const up = await supabase.from("state_achievement_options").update({ active: false } as any).eq("id", id);
    if (up.error) return setMsg("Disable failed: " + up.error.message);
    setMsg("✅ Disabled.");
    await loadAll();
  }

  // ---- Access CRUD ----
  const [newAccessUserId, setNewAccessUserId] = useState("");
  const [newAccessCanView, setNewAccessCanView] = useState(true);
  const [newAccessCanEdit, setNewAccessCanEdit] = useState(false);

  async function upsertAccess() {
    if (!canAdmin) return;
    setMsg(null);

    const uid = norm(newAccessUserId);
    if (!uid) return setMsg("User ID required.");

    const payload: AnyRow = {
      state_code: stateCode,
      user_id: uid,
      can_view: !!newAccessCanView,
      can_edit: !!newAccessCanEdit
    };

    const ins = await supabase.from("state_achievement_access").upsert(payload as any, { onConflict: "state_code,user_id" } as any).select("*").maybeSingle();
    if (ins.error) return setMsg("Access upsert failed: " + ins.error.message);

    setNewAccessUserId("");
    setMsg("✅ Access saved.");
    await loadAll();
  }

  async function saveAccessRow(a: AnyRow) {
    if (!canAdmin) return;
    setMsg(null);

    const id = a.id ? String(a.id) : null;
    if (id) {
      const patch: AnyRow = { can_view: a.can_view === true, can_edit: a.can_edit === true };
      const up = await supabase.from("state_achievement_access").update(patch as any).eq("id", id);
      if (up.error) return setMsg("Access update failed: " + up.error.message);
      setMsg("✅ Access updated.");
      await loadAll();
      return;
    }

    // fallback if table uses composite keys and no id
    const uid = String(a.user_id || "");
    if (!uid) return setMsg("Access row missing user_id.");
    const payload: AnyRow = { state_code: stateCode, user_id: uid, can_view: a.can_view === true, can_edit: a.can_edit === true };
    const up2 = await supabase.from("state_achievement_access").upsert(payload as any, { onConflict: "state_code,user_id" } as any);
    if (up2.error) return setMsg("Access save failed: " + up2.error.message);
    setMsg("✅ Access saved.");
    await loadAll();
  }

  async function removeAccess(a: AnyRow) {
    if (!canAdmin) return;
    if (!window.confirm("Remove access row?")) return;

    setMsg(null);
    if (a.id) {
      const del = await supabase.from("state_achievement_access").delete().eq("id", String(a.id));
      if (del.error) return setMsg("Delete failed: " + del.error.message);
      setMsg("✅ Removed.");
      await loadAll();
      return;
    }

    const uid = String(a.user_id || "");
    if (!uid) return setMsg("Row missing user_id.");
    const del2 = await supabase.from("state_achievement_access").delete().eq("state_code", stateCode).eq("user_id", uid);
    if (del2.error) return setMsg("Delete failed: " + del2.error.message);
    setMsg("✅ Removed.");
    await loadAll();
  }

  // ---- Export/Import ----
  async function copyJson(obj: any, label: string) {
    const txt = JSON.stringify(obj, null, 2);
    try { await navigator.clipboard.writeText(txt); setMsg("✅ Copied " + label + " JSON."); }
    catch { window.prompt("Copy " + label + " JSON:", txt); }
  }

  async function seedDefaults() {
    if (!canAdmin) return;
    setMsg(null);

    // SWP Weapon type
    const existingSwp = (types || []).find((t) => normLower(t.name) === "swp weapon");
    let swpId: string | null = existingSwp?.id ? String(existingSwp.id) : null;

    if (!swpId) {
      const ins = await supabase.from("state_achievement_types").insert({
        state_code: stateCode,
        name: "SWP Weapon",
        kind: "count",
        requires_option: true,
        required_count: 1,
        active: true
      } as any).select("*").maybeSingle();

      if (ins.error) return setMsg("Seed SWP type failed: " + ins.error.message);
      swpId = ins.data?.id ? String(ins.data.id) : null;
    }

    // Governor Rotations type
    const existingGov = (types || []).find((t) => normLower(t.name) === "governor rotations");
    if (!existingGov) {
      const ins2 = await supabase.from("state_achievement_types").insert({
        state_code: stateCode,
        name: "Governor Rotations",
        kind: "count",
        requires_option: false,
        required_count: 3,
        active: true
      } as any).select("*").maybeSingle();

      if (ins2.error) return setMsg("Seed Governor type failed: " + ins2.error.message);
    }

    // Rail Gun option
    if (swpId) {
      const existsRail = (options || []).some((o) => String(o.achievement_type_id) === swpId && normLower(o.label) === "rail gun");
      if (!existsRail) {
        const ins3 = await supabase.from("state_achievement_options").insert({
          achievement_type_id: swpId,
          label: "Rail Gun",
          sort: 0,
          active: true
        } as any).select("*").maybeSingle();

        if (ins3.error) return setMsg("Seed Rail Gun failed: " + ins3.error.message);
      }
    }

    setMsg("✅ Seeded defaults (SWP Weapon, Governor Rotations, Rail Gun).");
    await loadAll();
  }

  // UI helpers
  function typeName(id: any) {
    const t = id ? typeById[String(id)] : null;
    return String(t?.name || "Achievement");
  }
  function optionLabel(id: any) {
    if (!id) return "";
    const o = options.find((x) => String(x.id) === String(id));
    return o ? String(o.label || "") : "";
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🧟 Owner — State Achievements Admin</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => window.location.assign("/owner")}>Back to Owner</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => window.location.assign("/state/789/achievements")}>Player Form</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => window.location.assign("/state/789/achievements-tracker")}>Tracker</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={loadAll}>Refresh</button>
          <SupportBundleButton />
        </div>
      </div>

      <StateAchievementsExportPanel stateCode={stateCode} requests={requests} types={types} options={options} initialAllianceFilter={initialAllianceFromQuery || "ALL"} initialTypeFilter={initialTypeFromQuery || "ALL"} />

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ opacity: 0.75, fontSize: 12 }}>State</div>
          <input className="zombie-input" value={stateCode} onChange={(e) => setStateCode(e.target.value)} style={{ padding: "10px 12px", width: 120 }} />
          <div style={{ marginLeft: "auto", opacity: 0.75, fontSize: 12 }}>
            user={userId ? "yes" : "no"} • admin={String(isAppAdmin)} • owner={String(isDashboardOwner)}
          </div>
        </div>
        <div style={{ opacity: 0.75, fontSize: 12, marginTop: 8 }}>
          {loading ? "Loading…" : `types=${types.length} • options=${options.length} • requests=${requests.length} • access=${access.length}`}
        </div>
        {(initialAllianceFromQuery || initialTypeFromQuery || initialPlayerFromQuery || initialStatusFromQuery) ? (
        <div style={{ marginBottom: 10, border:"1px solid rgba(255,255,255,0.10)", background:"rgba(255,255,255,0.04)", borderRadius: 12, padding: 10 }}>
          Deep link filters active
          {initialAllianceFromQuery ? ` • Alliance: ${initialAllianceFromQuery}` : ""}
          {initialTypeFromQuery ? ` • Type: ${initialTypeFromQuery}` : ""}
          {initialPlayerFromQuery ? ` • Player: ${initialPlayerFromQuery}` : ""}
          {initialStatusFromQuery ? ` • Status: ${initialStatusFromQuery}` : ""}
        </div>
      ) : null}
      {msg ? <div style={{ marginTop: 10, opacity: 0.9 }}>{msg}</div> : null}
      </div>


      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: tab==="requests" ? 900 : 600 }} onClick={() => setTab("requests")}>Requests</button>
          <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: tab==="types" ? 900 : 600 }} onClick={() => setTab("types")}>Types</button>
          <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: tab==="options" ? 900 : 600 }} onClick={() => setTab("options")}>Options</button>
          <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: tab==="access" ? 900 : 600 }} onClick={() => setTab("access")}>Access</button>
          <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: tab==="export" ? 900 : 600 }} onClick={() => setTab("export")}>Export/Import</button>
          <div style={{ marginLeft: "auto" }}>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={seedDefaults} disabled={!canAdmin}>Seed Defaults</button>
          </div>
        </div>
      </div>

      {tab === "requests" ? (
        <div className="zombie-card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 900 }}>Requests Queue</div>
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
            Update counts/status/notes. Auto marks ✅ at 100%.
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {requests.slice(0, 200).map((r) => {
              const req = reqRequired(r);
              const cur = reqCurrent(r);
              const done = (String(r.status) === "completed") || (cur >= req);
              return (
                <div key={String(r.id)} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={selectedRequestIds.includes(String(r?.id || ""))}
                        onChange={() => toggleSelectedRequestId(String(r?.id || ""))}
                      />
                    </label>
                    <div style={{ fontWeight: 900 }}>{String(r.player_name || "Player")} <span style={{ opacity: 0.7 }}>({String(r.alliance_name || "—")})</span></div>
                    <div style={{ marginLeft: "auto", fontWeight: 900 }}>{cur}/{req}{done ? " ✅" : ""}</div>
                  </div>

                  <div style={{ opacity: 0.85, marginTop: 6 }}>
                    {typeName(r.achievement_type_id)}{r.option_id ? (" — " + optionLabel(r.option_id)) : ""}
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>Count</div>
                    <input
                      className="zombie-input"
                      value={String(r.current_count ?? 0)}
                      disabled={!canAdmin}
                      onChange={(e) => setLocalRequests(r.id, { current_count: Math.max(0, asInt(e.target.value, 0)) })}
                      style={{ padding: "8px 10px", width: 90 }}
                    />
                    <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} disabled={!canAdmin} onClick={() => setLocalRequests(r.id, { current_count: cur + 1, status: "in_progress" })}>+1</button>
                    <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} disabled={!canAdmin} onClick={() => setLocalRequests(r.id, { current_count: req, status: "completed" })}>Set ✅</button>

                    <div style={{ opacity: 0.75, fontSize: 12 }}>Status</div>
                    <select className="zombie-input" value={String(r.status || "submitted")} disabled={!canAdmin} onChange={(e) => setLocalRequests(r.id, { status: e.target.value })} style={{ padding: "8px 10px" }}>
                      <option value="submitted">submitted</option>
                      <option value="in_progress">in_progress</option>
                      <option value="completed">completed</option>
                      <option value="denied">denied</option>
                    </select>

                    <button className="zombie-btn" style={{ padding: "8px 10px", fontWeight: 900 }} disabled={!canAdmin} onClick={() => saveRequestRow(r)}>Save</button>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <textarea
                      className="zombie-input"
                      value={String(r.notes || "")}
                      disabled={!canAdmin}
                      onChange={(e) => setLocalRequests(r.id, { notes: e.target.value })}
                      placeholder="Notes"
                      style={{ padding: "10px 12px", width: "100%", minHeight: 60 }}
                    />
                  </div>

                  <div style={{ opacity: 0.6, fontSize: 12, marginTop: 8 }}>
                    created: {String(r.created_at || "—")}{r.completed_at ? (" • completed: " + String(r.completed_at)) : ""}
                  </div>
                </div>
              );
            })}
            {!loading && requests.length === 0 ? <div style={{ opacity: 0.75 }}>No requests.</div> : null}
          </div>
        </div>
      ) : null}

      {tab === "types" ? (
        <div className="zombie-card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 900 }}>Achievement Types</div>

          <div style={{ marginTop: 10, display: "grid", gap: 10, maxWidth: 760 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input className="zombie-input" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Type name (SWP Weapon)" style={{ padding: "10px 12px", minWidth: 240, flex: 1 }} />
              <input className="zombie-input" value={newTypeKind} onChange={(e) => setNewTypeKind(e.target.value)} placeholder="kind (count)" style={{ padding: "10px 12px", width: 140 }} />
              <input className="zombie-input" value={newTypeReqCount} onChange={(e) => setNewTypeReqCount(e.target.value)} placeholder="required_count" style={{ padding: "10px 12px", width: 140 }} />
              <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
                <input type="checkbox" checked={newTypeRequiresOption} onChange={(e) => setNewTypeRequiresOption(e.target.checked)} />
                requires option
              </label>
              <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: 900 }} disabled={!canAdmin} onClick={createType}>Create</button>
            </div>

            <div style={{ opacity: 0.65, fontSize: 12 }}>
              For Governor Rotations set required_count=3 and requires option unchecked.
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {types.map((t) => (
              <div key={String(t.id)} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontWeight: 900 }}>{String(t.name || t.id)}</div>
                  <div style={{ marginLeft: "auto", opacity: 0.75, fontSize: 12 }}>{String(t.kind || "")}</div>
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>required_count</div>
                  <input className="zombie-input" value={String(t.required_count ?? 1)} disabled={!canAdmin} onChange={(e) => setTypes((p) => p.map((x) => x.id===t.id ? { ...x, required_count: asInt(e.target.value, 1) } : x))} style={{ padding: "8px 10px", width: 100 }} />
                  <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
                    <input type="checkbox" checked={t.requires_option === true} disabled={!canAdmin} onChange={(e) => setTypes((p) => p.map((x) => x.id===t.id ? { ...x, requires_option: e.target.checked } : x))} />
                    requires option
                  </label>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
                    <input type="checkbox" checked={t.active === true} disabled={!canAdmin} onChange={(e) => setTypes((p) => p.map((x) => x.id===t.id ? { ...x, active: e.target.checked } : x))} />
                    active
                  </label>

                  <button className="zombie-btn" style={{ padding: "8px 10px", fontWeight: 900 }} disabled={!canAdmin} onClick={() => saveType(t)}>Save</button>
                  <button className="zombie-btn" style={{ padding: "8px 10px" }} disabled={!canAdmin} onClick={() => disableType(String(t.id))}>Disable</button>

                  <button className="zombie-btn" style={{ padding: "8px 10px" }} onClick={() => { setSelectedTypeId(String(t.id)); setTab("options"); }}>
                    Edit Options
                  </button>
                </div>
              </div>
            ))}
            {!loading && types.length === 0 ? <div style={{ opacity: 0.75 }}>No types yet.</div> : null}
          </div>
        </div>
      ) : null}

      {tab === "options" ? (
        <div className="zombie-card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 900 }}>Options (Weapons / Sub-choices)</div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ opacity: 0.75, fontSize: 12 }}>Type</div>
            <select className="zombie-input" value={selectedTypeId} onChange={(e) => setSelectedTypeId(e.target.value)} style={{ padding: "10px 12px", minWidth: 280 }}>
              {types.map((t) => (
                <option key={String(t.id)} value={String(t.id)}>{String(t.name || t.id)}</option>
              ))}
            </select>

            <input className="zombie-input" value={newOptLabel} onChange={(e) => setNewOptLabel(e.target.value)} placeholder="Option label (Rail Gun)" style={{ padding: "10px 12px", minWidth: 220, flex: 1 }} />
            <input className="zombie-input" value={newOptSort} onChange={(e) => setNewOptSort(e.target.value)} placeholder="sort" style={{ padding: "10px 12px", width: 120 }} />
            <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: 900 }} disabled={!canAdmin} onClick={createOption}>Add</button>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {(optionsByType[String(selectedTypeId || "")] || []).map((o) => (
              <div key={String(o.id)} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <input className="zombie-input" value={String(o.label || "")} disabled={!canAdmin} onChange={(e) => setOptions((p) => p.map((x) => x.id===o.id ? { ...x, label: e.target.value } : x))} style={{ padding: "8px 10px", minWidth: 240, flex: 1 }} />
                  <div style={{ opacity: 0.75, fontSize: 12 }}>sort</div>
                  <input className="zombie-input" value={String(o.sort ?? 0)} disabled={!canAdmin} onChange={(e) => setOptions((p) => p.map((x) => x.id===o.id ? { ...x, sort: asInt(e.target.value, 0) } : x))} style={{ padding: "8px 10px", width: 100 }} />
                  <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
                    <input type="checkbox" checked={o.active === true} disabled={!canAdmin} onChange={(e) => setOptions((p) => p.map((x) => x.id===o.id ? { ...x, active: e.target.checked } : x))} />
                    active
                  </label>
                  <button className="zombie-btn" style={{ padding: "8px 10px", fontWeight: 900 }} disabled={!canAdmin} onClick={() => saveOption(o)}>Save</button>
                  <button className="zombie-btn" style={{ padding: "8px 10px" }} disabled={!canAdmin} onClick={() => disableOption(String(o.id))}>Disable</button>
                </div>
              </div>
            ))}
            {!loading && (!selectedTypeId || (optionsByType[String(selectedTypeId)] || []).length === 0) ? <div style={{ opacity: 0.75 }}>No options for this type yet.</div> : null}
          </div>
        </div>
      ) : null}

      {tab === "access" ? (
        <div className="zombie-card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 900 }}>Access (Helpers)</div>
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
            Grant a helper Supabase user_id view/edit access for the tracker page.
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input className="zombie-input" value={newAccessUserId} onChange={(e) => setNewAccessUserId(e.target.value)} placeholder="helper user_id (UUID)" style={{ padding: "10px 12px", minWidth: 320, flex: 1 }} />
            <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
              <input type="checkbox" checked={newAccessCanView} onChange={(e) => setNewAccessCanView(e.target.checked)} />
              can_view
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
              <input type="checkbox" checked={newAccessCanEdit} onChange={(e) => setNewAccessCanEdit(e.target.checked)} />
              can_edit
            </label>
            <button className="zombie-btn" style={{ padding: "10px 12px", fontWeight: 900 }} disabled={!canAdmin} onClick={upsertAccess}>Save</button>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {access.map((a) => (
              <div key={String(a.id || (a.user_id + "_" + a.state_code))} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                <div style={{ fontWeight: 900 }}>user_id: {String(a.user_id || "—")}</div>
                <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
                    <input type="checkbox" checked={a.can_view === true} disabled={!canAdmin} onChange={(e) => setAccess((p) => p.map((x) => (x===a ? { ...x, can_view: e.target.checked } : x)))} />
                    can_view
                  </label>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
                    <input type="checkbox" checked={a.can_edit === true} disabled={!canAdmin} onChange={(e) => setAccess((p) => p.map((x) => (x===a ? { ...x, can_edit: e.target.checked } : x)))} />
                    can_edit
                  </label>
                  <button className="zombie-btn" style={{ padding: "8px 10px", fontWeight: 900 }} disabled={!canAdmin} onClick={() => saveAccessRow(a)}>Save</button>
                  <button className="zombie-btn" style={{ padding: "8px 10px" }} disabled={!canAdmin} onClick={() => removeAccess(a)}>Remove</button>
                </div>
              </div>
            ))}
            {!loading && access.length === 0 ? <div style={{ opacity: 0.75 }}>No helper access rows yet.</div> : null}
          </div>
        </div>
      ) : null}

      {tab === "export" ? (
        <div className="zombie-card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 900 }}>Export / Import</div>
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
            Safe exports (copy JSON). Imports are intentionally limited to PATCH operations to avoid corrupting data.
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => copyJson({ version: 1, exportedUtc: nowUtc(), state_code: stateCode, types }, "types")}>Copy Types JSON</button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => copyJson({ version: 1, exportedUtc: nowUtc(), state_code: stateCode, options }, "options")}>Copy Options JSON</button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => copyJson({ version: 1, exportedUtc: nowUtc(), state_code: stateCode, requests }, "requests")}>Copy Requests JSON</button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => copyJson({ version: 1, exportedUtc: nowUtc(), state_code: stateCode, access }, "access")}>Copy Access JSON</button>
          </div>

          <div style={{ marginTop: 12, opacity: 0.75, fontSize: 12 }}>
            Importing full datasets is intentionally not enabled yet (to avoid duplicate/invalid rows).
            If you want bulk-import for types/options later, we’ll add a strict validator first.
          </div>
        </div>
      ) : null}
    </div>
  );
}


















