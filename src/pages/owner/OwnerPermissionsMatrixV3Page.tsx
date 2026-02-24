import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";

type UserOpt = { user_id: string; display_name: string };
type DirEntry = { id: string; state_code: string; alliance_code: string; alliance_id: string | null; name: string | null; tag: string | null; active: boolean; sort_order: number | null };

type StateGrant = Record<string, any> & { state_code: string; user_id: string };
type AllianceGrant = Record<string, any> & { alliance_id: string; user_id: string };

type Field = { key: string; label: string };

const STATE_GROUPS: { title: string; fields: Field[] }[] = [
  { title: "Access", fields: [
    { key: "state_view", label: "State: View" },
    { key: "state_view_sensitive", label: "State: View sensitive" },
  ]},
  { title: "Onboarding / Admin", fields: [
    { key: "state_onboarding_approve", label: "Onboarding: Approve" },
    { key: "state_onboarding_provision", label: "Onboarding: Provision" },
    { key: "state_permissions_manage", label: "State: Manage permissions" },
    { key: "state_audit_view", label: "State: View audit" },
  ]},
  { title: "State Alerts", fields: [
    { key: "state_alerts_view", label: "Alerts: View" },
    { key: "state_alerts_create", label: "Alerts: Create" },
    { key: "state_alerts_edit_own", label: "Alerts: Edit own" },
    { key: "state_alerts_edit_any", label: "Alerts: Edit any" },
    { key: "state_alerts_pin", label: "Alerts: Pin" },
    { key: "state_alerts_delete", label: "Alerts: Delete" },
    { key: "state_alerts_moderate", label: "Alerts: Moderate" },
  ]},
  { title: "State Discussion", fields: [
    { key: "state_discussion_view", label: "Discussion: View" },
    { key: "state_discussion_create_threads", label: "Discussion: Create threads" },
    { key: "state_discussion_reply", label: "Discussion: Reply" },
    { key: "state_discussion_edit_own", label: "Discussion: Edit own" },
    { key: "state_discussion_edit_any", label: "Discussion: Edit any" },
    { key: "state_discussion_pin", label: "Discussion: Pin" },
    { key: "state_discussion_lock", label: "Discussion: Lock" },
    { key: "state_discussion_delete", label: "Discussion: Delete" },
    { key: "state_discussion_moderate", label: "Discussion: Moderate" },
  ]},
  { title: "Directory", fields: [
    { key: "state_directory_view", label: "Directory: View" },
    { key: "state_directory_add", label: "Directory: Add" },
    { key: "state_directory_edit", label: "Directory: Edit" },
    { key: "state_directory_deactivate", label: "Directory: Deactivate" },
    { key: "state_directory_reorder", label: "Directory: Reorder" },
    { key: "state_directory_sync", label: "Directory: Sync DB" },
  ]},
  { title: "Mail / Comms", fields: [
    { key: "state_mail_view", label: "Mail: View broadcasts" },
    { key: "state_mail_send_broadcast", label: "Mail: Send state broadcast" },
    { key: "state_mail_manage_templates", label: "Mail: Manage templates" },
    { key: "state_mail_manage_welcome", label: "Mail: Manage welcome mail" },
    { key: "state_mail_moderate", label: "Mail: Moderate" },
  ]},
  { title: "State Achievements", fields: [
    { key: "state_ach_view", label: "Achievements: View tracker" },
    { key: "state_ach_view_queue", label: "Achievements: View requests" },
    { key: "state_ach_create_for_others", label: "Achievements: Create for others" },
    { key: "state_ach_approve_reject", label: "Achievements: Approve/Reject" },
    { key: "state_ach_edit_progress", label: "Achievements: Edit progress" },
    { key: "state_ach_complete_reopen", label: "Achievements: Complete/Reopen" },
    { key: "state_ach_manage_catalog", label: "Achievements: Manage catalog" },
    { key: "state_ach_manage_options", label: "Achievements: Manage options" },
    { key: "state_ach_manage_access", label: "Achievements: Manage access" },
    { key: "state_ach_edit_any_details", label: "Achievements: Edit any details" },
    { key: "state_ach_delete_requests", label: "Achievements: Delete requests" },
  ]},
  { title: "Live Ops", fields: [
    { key: "state_ops_view", label: "Live Ops: View" },
    { key: "state_ops_edit", label: "Live Ops: Edit" },
    { key: "state_ops_manage_templates", label: "Live Ops: Manage templates" },
    { key: "state_ops_control_timers", label: "Live Ops: Control timers" },
    { key: "state_ops_export_import", label: "Live Ops: Export/Import" },
  ]},
  { title: "Discord (payload-only)", fields: [
    { key: "state_discord_use_composer", label: "Discord: Use composer" },
    { key: "state_discord_queue", label: "Discord: Queue payloads" },
    { key: "state_discord_outbox_manage", label: "Discord: Manage outbox" },
    { key: "state_discord_manage_mentions", label: "Discord: Manage mentions" },
    { key: "state_discord_manage_templates", label: "Discord: Manage templates" },
  ]},
];

const ALLIANCE_GROUPS: { title: string; fields: Field[] }[] = [
  { title: "Access", fields: [
    { key: "alliance_view_dashboard", label: "Alliance: View dashboard" },
    { key: "alliance_view_sensitive", label: "Alliance: View sensitive" },
  ]},
  { title: "Alliance Alerts", fields: [
    { key: "alliance_alerts_view", label: "Alerts: View" },
    { key: "alliance_alerts_create", label: "Alerts: Create" },
    { key: "alliance_alerts_edit_own", label: "Alerts: Edit own" },
    { key: "alliance_alerts_edit_any", label: "Alerts: Edit any" },
    { key: "alliance_alerts_pin", label: "Alerts: Pin" },
    { key: "alliance_alerts_delete", label: "Alerts: Delete" },
    { key: "alliance_alerts_moderate", label: "Alerts: Moderate" },
  ]},
  { title: "Announcements", fields: [
    { key: "alliance_announcements_view", label: "Announcements: View" },
    { key: "alliance_announcements_create", label: "Announcements: Create" },
    { key: "alliance_announcements_edit", label: "Announcements: Edit" },
    { key: "alliance_announcements_pin", label: "Announcements: Pin" },
    { key: "alliance_announcements_delete", label: "Announcements: Delete" },
  ]},
  { title: "Guides", fields: [
    { key: "alliance_guides_view", label: "Guides: View" },
    { key: "alliance_guides_create", label: "Guides: Create" },
    { key: "alliance_guides_edit", label: "Guides: Edit" },
    { key: "alliance_guides_publish", label: "Guides: Publish" },
    { key: "alliance_guides_delete", label: "Guides: Delete" },
  ]},
  { title: "Calendar", fields: [
    { key: "alliance_calendar_view", label: "Calendar: View" },
    { key: "alliance_calendar_create", label: "Calendar: Create" },
    { key: "alliance_calendar_edit", label: "Calendar: Edit" },
    { key: "alliance_calendar_delete", label: "Calendar: Delete" },
    { key: "alliance_calendar_manage_recurrence", label: "Calendar: Manage recurrence" },
    { key: "alliance_calendar_manage_reminders", label: "Calendar: Manage reminders" },
  ]},
  { title: "HQ Map", fields: [
    { key: "alliance_hq_view", label: "HQ: View" },
    { key: "alliance_hq_edit", label: "HQ: Edit" },
    { key: "alliance_hq_bulk_import_export", label: "HQ: Bulk import/export" },
    { key: "alliance_hq_manage_owners", label: "HQ: Manage owners" },
  ]},
  { title: "Alliance Achievements", fields: [
    { key: "alliance_ach_view", label: "Achievements: View tracker" },
    { key: "alliance_ach_view_queue", label: "Achievements: View requests" },
    { key: "alliance_ach_create_for_others", label: "Achievements: Create for others" },
    { key: "alliance_ach_approve_reject", label: "Achievements: Approve/Reject" },
    { key: "alliance_ach_edit_progress", label: "Achievements: Edit progress" },
    { key: "alliance_ach_complete_reopen", label: "Achievements: Complete/Reopen" },
    { key: "alliance_ach_manage_catalog", label: "Achievements: Manage catalog" },
    { key: "alliance_ach_manage_options", label: "Achievements: Manage options" },
    { key: "alliance_ach_manage_access", label: "Achievements: Manage access" },
    { key: "alliance_ach_edit_any_details", label: "Achievements: Edit any details" },
    { key: "alliance_ach_delete_requests", label: "Achievements: Delete requests" },
  ]},
  { title: "Admin meta", fields: [
    { key: "alliance_permissions_manage", label: "Alliance: Manage permissions" },
    { key: "alliance_memberships_manage", label: "Alliance: Manage memberships" },
  ]},
];

function computeLegacyStateFlags(g: StateGrant): Partial<StateGrant> {
  const alertsManage = !!(g.state_alerts_create || g.state_alerts_edit_any || g.state_alerts_pin || g.state_alerts_delete || g.state_alerts_moderate);
  const discussionManage = !!(g.state_discussion_create_threads || g.state_discussion_reply || g.state_discussion_edit_any || g.state_discussion_pin || g.state_discussion_lock || g.state_discussion_delete || g.state_discussion_moderate);
  const dirManage = !!(g.state_directory_add || g.state_directory_edit || g.state_directory_deactivate || g.state_directory_reorder || g.state_directory_sync);
  const mailManage = !!(g.state_mail_send_broadcast || g.state_mail_manage_templates || g.state_mail_manage_welcome || g.state_mail_moderate);
  const opsManage = !!(g.state_ops_edit || g.state_ops_manage_templates || g.state_ops_control_timers || g.state_ops_export_import);

  return {
    // keep your existing coarse flags alive
    can_view: !!g.state_view,
    can_edit: !!g.state_permissions_manage,
    can_manage_state_alerts: alertsManage,
    can_manage_discussion: discussionManage,
    can_manage_directory: dirManage,
    can_manage_mail: mailManage,
    can_manage_live_ops: opsManage,
  } as any;
}

function computeLegacyAllianceFlags(g: AllianceGrant): Partial<AllianceGrant> {
  const viewAlerts = !!(g.alliance_alerts_view || g.alliance_alerts_create || g.alliance_alerts_edit_any || g.alliance_alerts_pin || g.alliance_alerts_delete || g.alliance_alerts_moderate);
  const postAlerts = !!g.alliance_alerts_create;
  const manageAlerts = !!(g.alliance_alerts_edit_any || g.alliance_alerts_pin || g.alliance_alerts_delete || g.alliance_alerts_moderate);
  return {
    can_view_alerts: viewAlerts,
    can_post_alerts: postAlerts,
    can_manage_alerts: manageAlerts,
  } as any;
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: "flex", gap: 8, alignItems: "center", marginRight: 14, marginBottom: 8 }}>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export default function OwnerPermissionsMatrixV3Page() {
  const [tab, setTab] = useState<"state" | "alliance">("state");
  const [status, setStatus] = useState("");

  const [stateCode, setStateCode] = useState("789");
  const [directory, setDirectory] = useState<DirEntry[]>([]);
  const [allianceId, setAllianceId] = useState<string>("");

  const [stateUsers, setStateUsers] = useState<UserOpt[]>([]);
  const [allianceUsers, setAllianceUsers] = useState<UserOpt[]>([]);

  const [stateGrants, setStateGrants] = useState<Record<string, StateGrant>>({});
  const [allianceGrants, setAllianceGrants] = useState<Record<string, AllianceGrant>>({});

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const stateUserMap = useMemo(() => Object.fromEntries(stateUsers.map(u => [u.user_id, u.display_name])), [stateUsers]);
  const allianceUserMap = useMemo(() => Object.fromEntries(allianceUsers.map(u => [u.user_id, u.display_name])), [allianceUsers]);

  function displayUser(userId: string) {
    return stateUserMap[userId] || allianceUserMap[userId] || (userId ? userId.slice(0, 8) + "…" : "—");
  }

  async function loadDirectory() {
    const res = await supabase
      .from("alliance_directory_entries")
      .select("*")
      .eq("state_code", stateCode)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("alliance_code", { ascending: true });

    if (!res.error) {
      const list = (res.data ?? []) as any as DirEntry[];
      setDirectory(list);
      if (!allianceId) {
        const first = list.find(d => d.alliance_id)?.alliance_id ?? "";
        if (first) setAllianceId(String(first));
      }
    }
  }

  async function loadStateUsers() {
    const res = await supabase.rpc("list_state_users", { p_state_code: stateCode });
    if (res.error) { setStatus(res.error.message); return; }
    setStateUsers((res.data ?? []) as any);
  }

  async function loadAllianceUsers() {
    if (!allianceId) { setAllianceUsers([]); return; }
    const res = await supabase.rpc("list_alliance_users", { p_alliance_id: allianceId });
    if (res.error) { setStatus(res.error.message); return; }
    setAllianceUsers((res.data ?? []) as any);
  }

  async function loadStateGrants() {
    setStatus("Loading state grants…");
    const res = await supabase.from("state_access_grants").select("*").eq("state_code", stateCode).limit(2000);
    if (res.error) { setStatus(res.error.message); return; }
    const map: Record<string, StateGrant> = {};
    (res.data ?? []).forEach((r: any) => { map[String(r.user_id)] = r; });
    setStateGrants(map);
    setStatus("");
  }

  async function loadAllianceGrants() {
    if (!allianceId) { setAllianceGrants({}); return; }
    setStatus("Loading alliance grants…");
    const res = await supabase.from("alliance_access_grants").select("*").eq("alliance_id", allianceId).limit(2000);
    if (res.error) { setStatus(res.error.message); return; }
    const map: Record<string, AllianceGrant> = {};
    (res.data ?? []).forEach((r: any) => { map[String(r.user_id)] = r; });
    setAllianceGrants(map);
    setStatus("");
  }

  useEffect(() => { void loadDirectory(); void loadStateUsers(); void loadStateGrants(); }, [stateCode]);
  useEffect(() => { void loadAllianceUsers(); void loadAllianceGrants(); }, [allianceId]);

  function ensureStateGrant(user_id: string): StateGrant {
    const existing = stateGrants[user_id];
    if (existing) return existing;
    return { state_code: stateCode, user_id };
  }

  function ensureAllianceGrant(user_id: string): AllianceGrant {
    const existing = allianceGrants[user_id];
    if (existing) return existing;
    return { alliance_id: allianceId, user_id };
  }

  function setStateField(user_id: string, key: string, value: boolean) {
    setStateGrants(prev => ({ ...prev, [user_id]: { ...ensureStateGrant(user_id), ...prev[user_id], [key]: value } }));
  }

  function setAllianceField(user_id: string, key: string, value: boolean) {
    setAllianceGrants(prev => ({ ...prev, [user_id]: { ...ensureAllianceGrant(user_id), ...prev[user_id], [key]: value } }));
  }

  async function saveState(user_id: string) {
    const g = ensureStateGrant(user_id);
    const legacy = computeLegacyStateFlags(g);
    setStatus("Saving…");
    const payload = { ...g, ...legacy };

    const res = await supabase.from("state_access_grants").upsert(payload, { onConflict: "state_code,user_id" });
    if (res.error) { setStatus(res.error.message); return; }
    await loadStateGrants();
    setStatus("Saved ✅");
    window.setTimeout(() => setStatus(""), 900);
  }

  async function saveAlliance(user_id: string) {
    const g = ensureAllianceGrant(user_id);
    const legacy = computeLegacyAllianceFlags(g);
    setStatus("Saving…");
    const payload = { ...g, ...legacy };

    const res = await supabase.from("alliance_access_grants").upsert(payload, { onConflict: "alliance_id,user_id" });
    if (res.error) { setStatus(res.error.message); return; }
    await loadAllianceGrants();
    setStatus("Saved ✅");
    window.setTimeout(() => setStatus(""), 900);
  }

  function toggleExpand(key: string) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div style={{ padding: 16, maxWidth: 1350, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>Permissions Matrix (V3 — Fine-grained)</h1>
      <div style={{ opacity: 0.8, marginTop: 6 }}>
        Owner/Admin only • {status || "Manage state + alliance permissions (including achievements)."}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
        <button onClick={() => setTab("state")} disabled={tab==="state"}>State</button>
        <button onClick={() => setTab("alliance")} disabled={tab==="alliance"}>Alliance</button>

        <span style={{ opacity: 0.7 }}>• State</span>
        <input value={stateCode} onChange={(e) => setStateCode(e.target.value)} style={{ width: 90 }} />
        <button onClick={() => { void loadDirectory(); void loadStateUsers(); void loadStateGrants(); }}>Reload</button>

        {tab === "alliance" ? (
          <>
            <span style={{ opacity: 0.7 }}>• Alliance</span>
            <select value={allianceId} onChange={(e) => setAllianceId(e.target.value)} style={{ minWidth: 360 }}>
              <option value="">(select)</option>
              {directory.filter(d => !!d.alliance_id).map((d) => (
                <option key={d.id} value={String(d.alliance_id)}>
                  {d.alliance_code}{d.tag ? ` [${d.tag}]` : ""}{d.name ? ` — ${d.name}` : ""}
                </option>
              ))}
            </select>
          </>
        ) : null}
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      {tab === "state" ? (
        <div style={{ display: "grid", gap: 12 }}>
          {stateUsers.map((u) => {
            const uid = u.user_id;
            const g = ensureStateGrant(uid);
            const open = !!expanded["state:"+uid];
            return (
              <div key={uid} style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: 12, borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{displayUser(uid)} <span style={{ opacity: 0.7, fontSize: 12 }}>({uid.slice(0,8)}…)</span></div>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>state {stateCode}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => toggleExpand("state:"+uid)}>{open ? "Collapse" : "Expand"}</button>
                    <button onClick={() => saveState(uid)}>Save</button>
                  </div>
                </div>

                {open ? (
                  <div style={{ padding: 12 }}>
                    {STATE_GROUPS.map((grp) => (
                      <div key={grp.title} style={{ marginBottom: 10 }}>
                        <div style={{ fontWeight: 900, marginBottom: 6 }}>{grp.title}</div>
                        <div style={{ display: "flex", flexWrap: "wrap" }}>
                          {grp.fields.map((f) => (
                            <Checkbox
                              key={f.key}
                              checked={!!(g as any)[f.key]}
                              onChange={(v) => setStateField(uid, f.key, v)}
                              label={f.label}
                            />
                          ))}
                        </div>
                        <hr style={{ opacity: 0.2 }} />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {tab === "alliance" ? (
        <div style={{ display: "grid", gap: 12 }}>
          {allianceUsers.map((u) => {
            const uid = u.user_id;
            const g = ensureAllianceGrant(uid);
            const open = !!expanded["alliance:"+uid];
            return (
              <div key={uid} style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: 12, borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{displayUser(uid)} <span style={{ opacity: 0.7, fontSize: 12 }}>({uid.slice(0,8)}…)</span></div>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>alliance {allianceId ? allianceId.slice(0,8)+"…" : "(none)"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => toggleExpand("alliance:"+uid)}>{open ? "Collapse" : "Expand"}</button>
                    <button onClick={() => saveAlliance(uid)} disabled={!allianceId}>Save</button>
                  </div>
                </div>

                {open ? (
                  <div style={{ padding: 12 }}>
                    {ALLIANCE_GROUPS.map((grp) => (
                      <div key={grp.title} style={{ marginBottom: 10 }}>
                        <div style={{ fontWeight: 900, marginBottom: 6 }}>{grp.title}</div>
                        <div style={{ display: "flex", flexWrap: "wrap" }}>
                          {grp.fields.map((f) => (
                            <Checkbox
                              key={f.key}
                              checked={!!(g as any)[f.key]}
                              onChange={(v) => setAllianceField(uid, f.key, v)}
                              label={f.label}
                            />
                          ))}
                        </div>
                        <hr style={{ opacity: 0.2 }} />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
