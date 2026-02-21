import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type Tab = "requests" | "dropdowns" | "access" | "summary";
type SummaryFmt = "compact" | "detailed" | "governor" | "swp";

type AchType = {
  id: string;
  name: string;
  kind: "generic" | "swp_weapon" | "governor_count";
  requires_option: boolean;
  required_count: number;
  active: boolean;
};

type AchOption = {
  id: string;
  achievement_type_id: string;
  label: string;
  sort: number;
  active: boolean;
  achievement_type_name?: string;
};

type ReqRow = {
  id: string;
  player_name: string;
  alliance_name: string;
  status: "submitted" | "in_progress" | "completed" | "denied";
  current_count: number;
  required_count: number;
  completed_at: string | null;
  notes: string | null;
  created_at: string;

  state_achievement_types?: { name: string; kind: string; required_count: number } | null;
  state_achievement_options?: { label: string } | null;
};

type AccessRow = {
  id: string;
  user_id: string;
  can_view: boolean;
  can_edit: boolean;
  can_manage_types: boolean;
  created_at: string;
};

function nowUtc() { return new Date().toISOString(); }
function safeUpper(s: any) { const t = String(s || "").trim(); return t ? t.toUpperCase() : ""; }

async function copyText(txt: string) {
  try { await navigator.clipboard.writeText(txt); window.alert("Copied to clipboard."); }
  catch { window.prompt("Copy:", txt); }
}

function parseJsonPrompt(promptText: string): any | null {
  const raw = window.prompt(promptText);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { window.alert("Invalid JSON."); return null; }
}

export default function OwnerStateAchievementsPage() {
  const STATE = "789";
  const [tab, setTab] = useState<Tab>("requests");
  const [msg, setMsg] = useState<string | null>(null);

  // Requests
  const [reqs, setReqs] = useState<ReqRow[]>([]);
  const [filter, setFilter] = useState<"all" | "submitted" | "in_progress" | "completed" | "denied">("all");
  const viewReqs = useMemo(() => filter === "all" ? reqs : reqs.filter((r) => r.status === filter), [reqs, filter]);

  async function loadRequests() {
    setMsg(null);
    const r = await supabase
      .from("state_achievement_requests")
      .select(`
        id,player_name,alliance_name,status,current_count,required_count,completed_at,notes,created_at,
        state_achievement_types(name,kind,required_count),
        state_achievement_options(label)
      `)
      .eq("state_code", STATE)
      .order("created_at", { ascending: false });

    if (r.error) { setMsg("Load requests failed: " + r.error.message); setReqs([]); return; }
    setReqs((r.data as any) || []);
  }

  async function updateRequest(id: string, patch: any) {
    setMsg(null);
    const r = await supabase.from("state_achievement_requests").update({ ...patch, updated_at: nowUtc() } as any).eq("id", id);
    if (r.error) { setMsg("Update failed: " + r.error.message); return; }
    await loadRequests();
  }

  // Dropdowns
  const [types, setTypes] = useState<AchType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [options, setOptions] = useState<AchOption[]>([]);
  const [allOptions, setAllOptions] = useState<AchOption[]>([]);

  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeKind, setNewTypeKind] = useState<AchType["kind"]>("generic");
  const [newTypeReqOpt, setNewTypeReqOpt] = useState(false);
  const [newTypeReqCount, setNewTypeReqCount] = useState(1);

  const [newOptLabel, setNewOptLabel] = useState("");
  const [newOptSort, setNewOptSort] = useState(1);

  async function loadTypes() {
    setMsg(null);
    const r = await supabase
      .from("state_achievement_types")
      .select("id,name,kind,requires_option,required_count,active")
      .eq("state_code", STATE)
      .order("name", { ascending: true });

    if (r.error) { setMsg("Load types failed: " + r.error.message); setTypes([]); return; }
    setTypes((r.data as any) || []);
  }

  async function loadOptions(typeId: string) {
    if (!typeId) { setOptions([]); return; }
    const r = await supabase
      .from("state_achievement_options")
      .select("id,achievement_type_id,label,sort,active")
      .eq("achievement_type_id", typeId)
      .order("sort", { ascending: true })
      .order("label", { ascending: true });

    if (r.error) { setMsg("Load options failed: " + r.error.message); setOptions([]); return; }
    setOptions((r.data as any) || []);
  }

  async function loadAllOptionsForState() {
    setMsg(null);
    const r = await supabase
      .from("state_achievement_options")
      .select("id,achievement_type_id,label,sort,active,state_achievement_types!inner(name,state_code)")
      .eq("state_achievement_types.state_code", STATE)
      .order("label", { ascending: true });

    if (r.error) { setMsg("Load all options failed: " + r.error.message); setAllOptions([]); return; }
    const data = (r.data as any[]) || [];
    const decorated = data.map((x) => ({
      id: x.id,
      achievement_type_id: x.achievement_type_id,
      label: x.label,
      sort: x.sort,
      active: x.active,
      achievement_type_name: x.state_achievement_types?.name || undefined,
    })) as AchOption[];
    setAllOptions(decorated);
  }

  async function createType() {
    setMsg(null);
    const name = newTypeName.trim();
    if (!name) return setMsg("Type name required.");
    const payload: any = {
      state_code: STATE,
      name,
      kind: newTypeKind,
      requires_option: !!newTypeReqOpt,
      required_count: Math.max(1, Number(newTypeReqCount || 1)),
      active: true,
    };
    const r = await supabase.from("state_achievement_types").insert(payload).select("id").maybeSingle();
    if (r.error) return setMsg("Create type failed: " + r.error.message);
    setNewTypeName("");
    await loadTypes();
  }

  async function updateType(id: string, patch: any) {
    setMsg(null);
    const r = await supabase.from("state_achievement_types").update(patch as any).eq("id", id);
    if (r.error) return setMsg("Update type failed: " + r.error.message);
    await loadTypes();
  }

  async function createOption() {
    setMsg(null);
    if (!selectedTypeId) return setMsg("Select a type first.");
    const label = newOptLabel.trim();
    if (!label) return setMsg("Weapon/option label required.");
    const payload: any = { achievement_type_id: selectedTypeId, label, sort: Math.max(0, Number(newOptSort || 0)), active: true };
    const r = await supabase.from("state_achievement_options").insert(payload).select("id").maybeSingle();
    if (r.error) return setMsg("Create option failed: " + r.error.message);
    setNewOptLabel("");
    await loadOptions(selectedTypeId);
  }

  async function updateOption(id: string, patch: any) {
    setMsg(null);
    const r = await supabase.from("state_achievement_options").update(patch as any).eq("id", id);
    if (r.error) return setMsg("Update option failed: " + r.error.message);
    await loadOptions(selectedTypeId);
  }

  // ✅ NEW: Seed defaults (only inserts if missing)
  async function seedDefaults() {
    setMsg(null);

    // 1) SWP Weapon type
    let swpId: string | null = null;
    const swp = await supabase
      .from("state_achievement_types")
      .select("id")
      .eq("state_code", STATE)
      .eq("name", "SWP Weapon")
      .maybeSingle();

    if (swp.error && swp.status !== 406) { setMsg("Seed failed (SWP lookup): " + swp.error.message); return; }
    if (swp.data?.id) {
      swpId = swp.data.id as any;
    } else {
      const ins = await supabase
        .from("state_achievement_types")
        .insert({ state_code: STATE, name: "SWP Weapon", kind: "swp_weapon", requires_option: true, required_count: 1, active: true } as any)
        .select("id")
        .maybeSingle();

      if (ins.error) { setMsg("Seed failed (SWP insert): " + ins.error.message); return; }
      swpId = (ins.data as any)?.id || null;
    }

    // 2) Governor (3x) type
    const gov = await supabase
      .from("state_achievement_types")
      .select("id")
      .eq("state_code", STATE)
      .eq("name", "Governor (3x)")
      .maybeSingle();

    if (gov.error && gov.status !== 406) { setMsg("Seed failed (Governor lookup): " + gov.error.message); return; }
    if (!gov.data?.id) {
      const insGov = await supabase
        .from("state_achievement_types")
        .insert({ state_code: STATE, name: "Governor (3x)", kind: "governor_count", requires_option: false, required_count: 3, active: true } as any)
        .select("id")
        .maybeSingle();

      if (insGov.error) { setMsg("Seed failed (Governor insert): " + insGov.error.message); return; }
    }

    // 3) Rail Gun option for SWP
    if (swpId) {
      const rail = await supabase
        .from("state_achievement_options")
        .select("id")
        .eq("achievement_type_id", swpId)
        .eq("label", "Rail Gun")
        .maybeSingle();

      if (rail.error && rail.status !== 406) { setMsg("Seed failed (Rail lookup): " + rail.error.message); return; }
      if (!rail.data?.id) {
        const insRail = await supabase
          .from("state_achievement_options")
          .insert({ achievement_type_id: swpId, label: "Rail Gun", sort: 1, active: true } as any)
          .select("id")
          .maybeSingle();

        if (insRail.error) { setMsg("Seed failed (Rail insert): " + insRail.error.message); return; }
      }
    }

    await loadTypes();
    await loadAllOptionsForState();
    if (swpId) {
      setSelectedTypeId(swpId);
      await loadOptions(swpId);
    }

    setMsg("✅ Seeded defaults: SWP Weapon + Governor (3x) + Rail Gun (if missing).");
  }

  // Access
  const [access, setAccess] = useState<AccessRow[]>([]);
  const [newUserId, setNewUserId] = useState("");
  const [canView, setCanView] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [canManageTypes, setCanManageTypes] = useState(false);

  async function loadAccess() {
    setMsg(null);
    const r = await supabase
      .from("state_achievement_access")
      .select("id,user_id,can_view,can_edit,can_manage_types,created_at")
      .eq("state_code", STATE)
      .order("created_at", { ascending: false });

    if (r.error) { setMsg("Load access failed: " + r.error.message); setAccess([]); return; }
    setAccess((r.data as any) || []);
  }

  async function addAccess() {
    setMsg(null);
    const u = newUserId.trim();
    if (!u) return setMsg("Paste the user's Supabase auth user_id.");
    const payload: any = { state_code: STATE, user_id: u, can_view: !!canView, can_edit: !!canEdit, can_manage_types: !!canManageTypes };
    const r = await supabase.from("state_achievement_access").insert(payload).select("id").maybeSingle();
    if (r.error) return setMsg("Add access failed: " + r.error.message);
    setNewUserId("");
    await loadAccess();
  }

  async function updateAccess(id: string, patch: any) {
    setMsg(null);
    const r = await supabase.from("state_achievement_access").update(patch as any).eq("id", id);
    if (r.error) return setMsg("Update access failed: " + r.error.message);
    await loadAccess();
  }

  async function deleteAccess(id: string) {
    if (!window.confirm("Delete access entry?")) return;
    setMsg(null);
    const r = await supabase.from("state_achievement_access").delete().eq("id", id);
    if (r.error) return setMsg("Delete failed: " + r.error.message);
    await loadAccess();
  }

  // Summary
  const [fmt, setFmt] = useState<SummaryFmt>("compact");

  const byType = useMemo(() => {
    const map: Record<string, ReqRow[]> = {};
    for (const r of reqs) {
      const name = r.state_achievement_types?.name || "Unknown";
      if (!map[name]) map[name] = [];
      map[name].push(r);
    }
    return map;
  }, [reqs]);

  const swpRows = useMemo(() => reqs.filter((r) => (r.state_achievement_types?.kind === "swp_weapon") || (safeUpper(r.state_achievement_types?.name) === "SWP WEAPON")), [reqs]);
  const govRows = useMemo(() => reqs.filter((r) => (r.state_achievement_types?.kind === "governor_count") || safeUpper(r.state_achievement_types?.name).includes("GOVERNOR")), [reqs]);

  const summaryText = useMemo(() => {
    const header = `🏆 State ${STATE} — Achievements Update`;
    const lines: string[] = [header, ""];

    function addTypeBlock(title: string, rows: ReqRow[]) {
      const total = rows.length;
      const completed = rows.filter((r) => r.status === "completed").length;
      const inprog = rows.filter((r) => r.status === "in_progress").length;
      const submitted = rows.filter((r) => r.status === "submitted").length;
      lines.push(`• ${title}: ${total} (✅ ${completed} | 🟡 ${inprog} | 📩 ${submitted})`);
    }

    if (fmt === "compact") {
      if (swpRows.length) {
        const byWeapon: Record<string, number> = {};
        for (const r of swpRows) {
          const w = r.state_achievement_options?.label || "Unknown Weapon";
          byWeapon[w] = (byWeapon[w] || 0) + 1;
        }
        addTypeBlock("SWP Weapon", swpRows);
        const top = Object.keys(byWeapon).sort((a,b) => (byWeapon[b]-byWeapon[a])).slice(0, 6);
        if (top.length) lines.push(`  Weapons: ${top.map((w) => `${w}(${byWeapon[w]})`).join(", ")}`);
      }
      if (govRows.length) {
        addTypeBlock("Governor (3x)", govRows);
        const close = govRows
          .filter((r) => r.status !== "completed")
          .sort((a,b) => (b.current_count||0)-(a.current_count||0))
          .slice(0, 6);
        if (close.length) {
          lines.push("  Closest:");
          for (const r of close) lines.push(`  - ${r.player_name} (${r.alliance_name}) — ${r.current_count || 0}/${r.required_count || 3}`);
        }
      }

      const otherNames = Object.keys(byType).filter((n) => safeUpper(n) !== "SWP WEAPON" && !safeUpper(n).includes("GOVERNOR"));
      for (const n of otherNames.sort()) addTypeBlock(n, byType[n]);

      return lines.join("\n");
    }

    if (fmt === "swp") {
      lines.push("🧨 SWP Weapons");
      const byWeapon: Record<string, ReqRow[]> = {};
      for (const r of swpRows) {
        const w = r.state_achievement_options?.label || "Unknown Weapon";
        if (!byWeapon[w]) byWeapon[w] = [];
        byWeapon[w].push(r);
      }
      for (const w of Object.keys(byWeapon).sort()) {
        const rows = byWeapon[w];
        const done = rows.filter((r) => r.status === "completed").length;
        lines.push(`\n• ${w}: ${rows.length} (✅ ${done})`);
        for (const r of rows.slice(0, 25)) lines.push(`  - ${r.player_name} (${r.alliance_name}) — ${r.status}`);
      }
      if (!swpRows.length) lines.push("(none)");
      return lines.join("\n");
    }

    if (fmt === "governor") {
      lines.push("👑 Governor (3x)");
      if (!govRows.length) { lines.push("(none)"); return lines.join("\n"); }
      const sorted = [...govRows].sort((a,b) => (b.current_count||0)-(a.current_count||0));
      for (const r of sorted) {
        const done = r.status === "completed" ? " ✅" : "";
        lines.push(`- ${r.player_name} (${r.alliance_name}) — ${r.current_count || 0}/${r.required_count || 3} • ${r.status}${done}`);
      }
      return lines.join("\n");
    }

    // detailed
    lines.push("📋 Detailed by Achievement");
    const names = Object.keys(byType).sort();
    for (const name of names) {
      const rows = byType[name];
      lines.push(`\n== ${name} ==`);
      for (const r of rows.slice(0, 40)) {
        const opt = r.state_achievement_options?.label ? ` — ${r.state_achievement_options.label}` : "";
        const prog = (r.required_count || 1) > 1 ? ` (${r.current_count || 0}/${r.required_count})` : "";
        lines.push(`- ${r.player_name} (${r.alliance_name})${opt}${prog} • ${r.status}`);
      }
    }
    return lines.join("\n");
  }, [STATE, fmt, reqs, byType, swpRows, govRows]);

  async function exportAllBundle() {
    setMsg(null);
    await loadTypes();
    await loadAccess();
    await loadAllOptionsForState();
    await loadRequests();

    const bundle = {
      version: 1,
      exportedUtc: nowUtc(),
      state: STATE,
      types,
      options: allOptions,
      access,
      requests: reqs,
      note: "Use Import tools on Summary tab to restore lists + permissions. Requests import is intentionally not implemented.",
    };
    await copyText(JSON.stringify(bundle, null, 2));
  }

  async function exportJson(kind: "requests" | "types" | "options" | "access") {
    setMsg(null);
    try {
      if (kind === "options") await loadAllOptionsForState();
      const payload: any = { version: 1, exportedUtc: nowUtc(), state: STATE, kind };
      if (kind === "requests") payload.data = reqs;
      if (kind === "types") payload.data = types;
      if (kind === "options") payload.data = allOptions;
      if (kind === "access") payload.data = access;
      await copyText(JSON.stringify(payload, null, 2));
    } catch (e: any) {
      setMsg("Export failed: " + String(e?.message || e));
    }
  }

  async function importTypesFromJson() {
    setMsg(null);
    const p = parseJsonPrompt("Paste Types export JSON (kind=types) or ALL bundle JSON:");
    if (!p) return;

    const data: any[] =
      (p.kind === "types" && Array.isArray(p.data)) ? p.data :
      (Array.isArray(p.types)) ? p.types :
      [];

    if (!data.length) { setMsg("Import types: no data found in JSON."); return; }

    let ok = 0, fail = 0;
    for (const row of data) {
      try {
        const name = String(row.name || "").trim();
        if (!name) { fail++; continue; }
        const kind = (row.kind === "swp_weapon" || row.kind === "governor_count") ? row.kind : "generic";
        const requires_option = !!row.requires_option;
        const required_count = Math.max(1, Number(row.required_count || 1));
        const active = (row.active !== false);

        const existing = await supabase
          .from("state_achievement_types")
          .select("id")
          .eq("state_code", STATE)
          .eq("name", name)
          .maybeSingle();

        if (existing.error && existing.status !== 406) throw new Error(existing.error.message);

        if (existing.data?.id) {
          const up = await supabase.from("state_achievement_types").update({ kind, requires_option, required_count, active } as any).eq("id", existing.data.id);
          if (up.error) throw new Error(up.error.message);
        } else {
          const ins = await supabase.from("state_achievement_types").insert({ state_code: STATE, name, kind, requires_option, required_count, active } as any);
          if (ins.error) throw new Error(ins.error.message);
        }
        ok++;
      } catch {
        fail++;
      }
    }

    await loadTypes();
    setMsg(`Import types done. OK=${ok} FAIL=${fail}`);
  }

  async function importOptionsFromJson() {
    setMsg(null);
    const p = parseJsonPrompt("Paste Options export JSON (kind=options) or ALL bundle JSON:");
    if (!p) return;

    const data: any[] =
      (p.kind === "options" && Array.isArray(p.data)) ? p.data :
      (Array.isArray(p.options)) ? p.options :
      [];

    if (!data.length) { setMsg("Import options: no data found in JSON."); return; }

    await loadTypes();
    const typeByName: Record<string, AchType> = {};
    for (const t of types) typeByName[safeUpper(t.name)] = t;

    let ok = 0, fail = 0, skippedMissingType = 0;

    for (const row of data) {
      try {
        const label = String(row.label || "").trim();
        if (!label) { fail++; continue; }

        const typeName = String(row.achievement_type_name || row.type_name || "").trim();
        const typeIdRaw = String(row.achievement_type_id || "").trim();

        let typeId = "";
        if (typeName) {
          const t = typeByName[safeUpper(typeName)];
          if (t?.id) typeId = t.id;
        }
        if (!typeId && typeIdRaw) {
          const exists = types.find((t) => t.id === typeIdRaw);
          if (exists) typeId = typeIdRaw;
        }
        if (!typeId) { skippedMissingType++; continue; }

        const sort = Math.max(0, Number(row.sort || 0));
        const active = (row.active !== false);

        const ex = await supabase
          .from("state_achievement_options")
          .select("id")
          .eq("achievement_type_id", typeId)
          .eq("label", label)
          .maybeSingle();

        if (ex.error && ex.status !== 406) throw new Error(ex.error.message);

        if (ex.data?.id) {
          const up = await supabase.from("state_achievement_options").update({ sort, active } as any).eq("id", ex.data.id);
          if (up.error) throw new Error(up.error.message);
        } else {
          const ins = await supabase.from("state_achievement_options").insert({ achievement_type_id: typeId, label, sort, active } as any);
          if (ins.error) throw new Error(ins.error.message);
        }
        ok++;
      } catch {
        fail++;
      }
    }

    if (selectedTypeId) await loadOptions(selectedTypeId);
    await loadAllOptionsForState();
    setMsg(`Import options done. OK=${ok} FAIL=${fail} SKIP(no type)=${skippedMissingType}`);
  }

  async function importAccessFromJson() {
    setMsg(null);
    const p = parseJsonPrompt("Paste Access export JSON (kind=access) or ALL bundle JSON:");
    if (!p) return;

    const data: any[] =
      (p.kind === "access" && Array.isArray(p.data)) ? p.data :
      (Array.isArray(p.access)) ? p.access :
      [];

    if (!data.length) { setMsg("Import access: no data found in JSON."); return; }

    let ok = 0, fail = 0;
    for (const row of data) {
      try {
        const user_id = String(row.user_id || "").trim();
        if (!user_id) { fail++; continue; }
        const can_view = (row.can_view !== false);
        const can_edit = !!row.can_edit;
        const can_manage_types = !!row.can_manage_types;

        const ex = await supabase
          .from("state_achievement_access")
          .select("id")
          .eq("state_code", STATE)
          .eq("user_id", user_id)
          .maybeSingle();

        if (ex.error && ex.status !== 406) throw new Error(ex.error.message);

        if (ex.data?.id) {
          const up = await supabase.from("state_achievement_access").update({ can_view, can_edit, can_manage_types } as any).eq("id", ex.data.id);
          if (up.error) throw new Error(up.error.message);
        } else {
          const ins = await supabase.from("state_achievement_access").insert({ state_code: STATE, user_id, can_view, can_edit, can_manage_types } as any);
          if (ins.error) throw new Error(ins.error.message);
        }
        ok++;
      } catch {
        fail++;
      }
    }

    await loadAccess();
    setMsg(`Import access done. OK=${ok} FAIL=${fail}`);
  }

  async function importRequestsNotice() {
    window.alert("Requests import is intentionally disabled to avoid corrupting player submissions.");
  }

  useEffect(() => { loadRequests(); }, []);

  useEffect(() => {
    if (tab === "requests") loadRequests();
    if (tab === "dropdowns") { loadTypes(); loadAllOptionsForState(); if (selectedTypeId) loadOptions(selectedTypeId); }
    if (tab === "access") loadAccess();
    if (tab === "summary") { loadRequests(); loadTypes(); loadAccess(); loadAllOptionsForState(); }
  }, [tab]);

  useEffect(() => { if (tab === "dropdowns") loadOptions(selectedTypeId); }, [selectedTypeId]);

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🧟 Owner — State Achievements (789)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <SupportBundleButton />
        </div>
      </div>

      {msg ? (
        <div className="zombie-card" style={{ marginTop: 12, border: "1px solid rgba(255,80,80,0.35)" }}>
          <div style={{ fontWeight: 900 }}>Message</div>
          <div style={{ opacity: 0.85, marginTop: 6 }}>{msg}</div>
        </div>
      ) : null}

      <div className="zombie-card" style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => setTab("requests")}>Requests</button>
        <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => setTab("dropdowns")}>Dropdowns</button>
        <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => setTab("access")}>Access</button>
        <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => setTab("summary")}>Summary</button>
      </div>

      {tab === "summary" ? (
        <div style={{ marginTop: 12 }}>
          <div className="zombie-card">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontWeight: 900 }}>Discord-ready Summary + Backup Bundle</div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={loadRequests}>Refresh</button>
                <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => copyText(summaryText)}>Copy Summary</button>
              </div>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ opacity: 0.75, fontSize: 12 }}>Format</div>
              <select className="zombie-input" value={fmt} onChange={(e) => setFmt(e.target.value as any)} style={{ padding: "10px 12px" }}>
                <option value="compact">Compact</option>
                <option value="detailed">Detailed</option>
                <option value="governor">Governor Only</option>
                <option value="swp">SWP Weapons Only</option>
              </select>

              <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={exportAllBundle}>Export ALL Bundle JSON</button>

              <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={importTypesFromJson}>Import Types</button>
              <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={importOptionsFromJson}>Import Options</button>
              <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={importAccessFromJson}>Import Access</button>
              <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={importRequestsNotice}>Import Requests (disabled)</button>
            </div>

            <pre style={{ marginTop: 12, whiteSpace: "pre-wrap", fontSize: 12, padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
{summaryText}
            </pre>
          </div>
        </div>
      ) : null}

      {tab === "requests" ? (
        <div style={{ marginTop: 12 }}>
          <div className="zombie-card">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ opacity: 0.75, fontSize: 12 }}>Filter</div>
              <select className="zombie-input" value={filter} onChange={(e) => setFilter(e.target.value as any)} style={{ padding: "10px 12px" }}>
                <option value="all">All</option>
                <option value="submitted">submitted</option>
                <option value="in_progress">in_progress</option>
                <option value="completed">completed</option>
                <option value="denied">denied</option>
              </select>

              <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => exportJson("requests")}>Export Requests JSON</button>
              <button className="zombie-btn" style={{ padding: "10px 12px", marginLeft: "auto" }} onClick={loadRequests}>Refresh</button>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {viewReqs.map((r) => {
              const t = r.state_achievement_types?.name || "Achievement";
              const kind = String(r.state_achievement_types?.kind || "");
              const opt = r.state_achievement_options?.label ? (" — " + r.state_achievement_options.label) : "";
              const needsCount = (r.required_count || 1) > 1 || kind === "governor_count";
              const prog = needsCount ? ` (${r.current_count}/${r.required_count})` : "";
              const done = r.status === "completed" ? " ✅" : "";

              return (
                <div key={r.id} className="zombie-card">
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ fontWeight: 900 }}>{t}{opt}{prog}{done}</div>
                    <div style={{ marginLeft: "auto", opacity: 0.7, fontSize: 12 }}>{r.created_at}</div>
                  </div>

                  <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>
                    Player: <b>{r.player_name}</b> • Alliance: <b>{r.alliance_name}</b>
                  </div>

                  {r.notes ? <div style={{ marginTop: 8, opacity: 0.75, whiteSpace: "pre-wrap" }}>{r.notes}</div> : null}

                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>Status</div>
                    <select
                      className="zombie-input"
                      value={r.status}
                      onChange={(e) => {
                        const v = e.target.value;
                        const patch: any = { status: v };
                        if (v === "completed" && !r.completed_at) patch.completed_at = nowUtc();
                        if (v !== "completed") patch.completed_at = null;
                        updateRequest(r.id, patch);
                      }}
                      style={{ padding: "10px 12px" }}
                    >
                      <option value="submitted">submitted</option>
                      <option value="in_progress">in_progress</option>
                      <option value="completed">completed</option>
                      <option value="denied">denied</option>
                    </select>

                    {needsCount ? (
                      <>
                        <div style={{ opacity: 0.75, fontSize: 12 }}>Count</div>
                        <button
                          className="zombie-btn"
                          style={{ padding: "10px 12px" }}
                          onClick={() => {
                            const nextCount = Math.max(0, (r.current_count || 0) - 1);
                            const patch: any = { current_count: nextCount };
                            if (r.status === "completed" && nextCount < (r.required_count || 1)) {
                              patch.status = "in_progress";
                              patch.completed_at = null;
                            }
                            updateRequest(r.id, patch);
                          }}
                        >
                          -1
                        </button>

                        <button
                          className="zombie-btn"
                          style={{ padding: "10px 12px" }}
                          onClick={() => {
                            const nextCount = (r.current_count || 0) + 1;
                            const patch: any = { current_count: nextCount };
                            if (nextCount >= (r.required_count || 1)) {
                              patch.status = "completed";
                              patch.completed_at = nowUtc();
                            } else if (r.status === "submitted") {
                              patch.status = "in_progress";
                            }
                            updateRequest(r.id, patch);
                          }}
                        >
                          +1
                        </button>
                      </>
                    ) : null}

                    <button
                      className="zombie-btn"
                      style={{ padding: "10px 12px" }}
                      onClick={() => updateRequest(r.id, { current_count: r.required_count, status: "completed", completed_at: nowUtc() })}
                    >
                      Mark Complete
                    </button>
                  </div>

                  {r.completed_at ? <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>Completed: {r.completed_at}</div> : null}
                </div>
              );
            })}
            {viewReqs.length === 0 ? <div style={{ opacity: 0.75 }}>No requests.</div> : null}
          </div>
        </div>
      ) : null}

      {tab === "dropdowns" ? (
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(340px, 1fr) minmax(340px, 1fr)", gap: 12 }}>
          <div className="zombie-card">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontWeight: 900 }}>Achievement Types</div>
              <button className="zombie-btn" style={{ marginLeft: "auto", padding: "10px 12px" }} onClick={seedDefaults}>
                Seed Defaults (SWP + Governor + Rail Gun)
              </button>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <input className="zombie-input" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="New achievement name" style={{ padding: "10px 12px" }} />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <select className="zombie-input" value={newTypeKind} onChange={(e) => setNewTypeKind(e.target.value as any)} style={{ padding: "10px 12px", minWidth: 180 }}>
                  <option value="generic">generic</option>
                  <option value="swp_weapon">swp_weapon</option>
                  <option value="governor_count">governor_count</option>
                </select>

                <input className="zombie-input" type="number" value={newTypeReqCount} onChange={(e) => setNewTypeReqCount(Number(e.target.value))} style={{ padding: "10px 12px", width: 120 }} />
                <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
                  <input type="checkbox" checked={newTypeReqOpt} onChange={(e) => setNewTypeReqOpt(e.target.checked)} />
                  requires option
                </label>

                <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={createType}>Create</button>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {types.map((t) => (
                <div key={t.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ fontWeight: 900 }}>{t.name} {t.active ? "" : "(inactive)"}</div>
                    <div style={{ marginLeft: "auto", opacity: 0.7, fontSize: 12 }}>{t.kind} • req {t.required_count} • opt {t.requires_option ? "yes" : "no"}</div>
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => setSelectedTypeId(t.id)}>Manage Weapons/Options</button>
                    <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => updateType(t.id, { active: !t.active })}>{t.active ? "Deactivate" : "Activate"}</button>
                  </div>
                </div>
              ))}
              {types.length === 0 ? <div style={{ opacity: 0.75 }}>No types.</div> : null}
            </div>
          </div>

          <div className="zombie-card">
            <div style={{ fontWeight: 900 }}>Weapons / Options</div>
            <div style={{ marginTop: 10 }}>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Selected Achievement</div>
              <select className="zombie-input" value={selectedTypeId} onChange={(e) => setSelectedTypeId(e.target.value)} style={{ width: "100%", padding: "10px 12px" }}>
                <option value="">(select)</option>
                {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {selectedTypeId ? (
              <>
                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input className="zombie-input" value={newOptLabel} onChange={(e) => setNewOptLabel(e.target.value)} placeholder="Weapon name" style={{ padding: "10px 12px", flex: 1, minWidth: 220 }} />
                  <input className="zombie-input" type="number" value={newOptSort} onChange={(e) => setNewOptSort(Number(e.target.value))} style={{ padding: "10px 12px", width: 120 }} />
                  <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={createOption}>Add</button>
                </div>

                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  {options.map((o) => (
                    <div key={o.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <div style={{ fontWeight: 900 }}>#{o.sort} {o.label} {o.active ? "" : "(inactive)"}</div>
                        <button className="zombie-btn" style={{ marginLeft: "auto", padding: "6px 8px", fontSize: 12 }} onClick={() => updateOption(o.id, { active: !o.active })}>
                          {o.active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </div>
                  ))}
                  {options.length === 0 ? <div style={{ opacity: 0.75 }}>No options.</div> : null}
                </div>
              </>
            ) : (
              <div style={{ marginTop: 12, opacity: 0.75 }}>Select an achievement type.</div>
            )}
          </div>
        </div>
      ) : null}

      {tab === "access" ? (
        <div style={{ marginTop: 12 }}>
          <div className="zombie-card">
            <div style={{ fontWeight: 900 }}>Grant Tracker Permissions</div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input className="zombie-input" value={newUserId} onChange={(e) => setNewUserId(e.target.value)} placeholder="Supabase auth user_id" style={{ padding: "10px 12px", minWidth: 280 }} />
              <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
                <input type="checkbox" checked={canView} onChange={(e) => setCanView(e.target.checked)} /> can_view
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
                <input type="checkbox" checked={canEdit} onChange={(e) => setCanEdit(e.target.checked)} /> can_edit
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
                <input type="checkbox" checked={canManageTypes} onChange={(e) => setCanManageTypes(e.target.checked)} /> can_manage_types
              </label>
              <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={addAccess}>Add</button>
            </div>

            <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
              can_view = see requests • can_edit = update counts/status • can_manage_types = edit dropdown lists
            </div>
          </div>

          <div className="zombie-card" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 900 }}>Access List</div>
            <button className="zombie-btn" style={{ padding: "10px 12px", marginTop: 10 }} onClick={loadAccess}>Refresh</button>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {access.map((a) => (
                <div key={a.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                  <div style={{ fontWeight: 900 }}>{a.user_id}</div>
                  <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>Created: {a.created_at}</div>

                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
                      <input type="checkbox" checked={a.can_view} onChange={(e) => updateAccess(a.id, { can_view: e.target.checked })} /> can_view
                    </label>
                    <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
                      <input type="checkbox" checked={a.can_edit} onChange={(e) => updateAccess(a.id, { can_edit: e.target.checked })} /> can_edit
                    </label>
                    <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.85 }}>
                      <input type="checkbox" checked={a.can_manage_types} onChange={(e) => updateAccess(a.id, { can_manage_types: e.target.checked })} /> can_manage_types
                    </label>
                    <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => deleteAccess(a.id)}>Delete</button>
                  </div>
                </div>
              ))}
              {access.length === 0 ? <div style={{ opacity: 0.75 }}>No access entries.</div> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}