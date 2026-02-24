import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";

type UserOpt = { user_id: string; display_name: string };

type StateGrant = {
  state_code: string;
  user_id: string;
  can_view: boolean;
  can_edit: boolean;
  can_manage_directory: boolean;
  can_manage_mail: boolean;
  can_manage_state_alerts: boolean;
  can_manage_discussion: boolean;
  can_manage_live_ops: boolean;
};

type AllianceGrant = {
  alliance_id: string;
  user_id: string;
  can_view_alerts: boolean;
  can_post_alerts: boolean;
  can_manage_alerts: boolean;
};

type DirEntry = {
  id: string;
  state_code: string;
  alliance_code: string;
  alliance_id: string | null;
  tag: string | null;
  name: string | null;
  active: boolean;
  sort_order: number;
};

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function OwnerPermissionsMatrixV2Page() {
  const [tab, setTab] = useState<"state" | "alliance" | "export">("state");
  const [status, setStatus] = useState("");

  const [stateCode, setStateCode] = useState("789");

  const [directory, setDirectory] = useState<DirEntry[]>([]);
  const [allianceId, setAllianceId] = useState<string>("");

  const [stateUsers, setStateUsers] = useState<UserOpt[]>([]);
  const [allianceUsers, setAllianceUsers] = useState<UserOpt[]>([]);

  const [stateGrants, setStateGrants] = useState<StateGrant[]>([]);
  const [allianceGrants, setAllianceGrants] = useState<AllianceGrant[]>([]);

  const [addStateUserId, setAddStateUserId] = useState("");
  const [addAllianceUserId, setAddAllianceUserId] = useState("");

  async function loadDirectory() {
    const res = await supabase
      .from("alliance_directory_entries")
      .select("id,state_code,alliance_code,alliance_id,tag,name,active,sort_order")
      .eq("state_code", stateCode)
      .order("sort_order", { ascending: true })
      .order("alliance_code", { ascending: true });

    if (!res.error) {
      const list = (res.data ?? []) as any as DirEntry[];
      setDirectory(list.filter((d) => d.active !== false));
      const first = list.find((d) => d.alliance_id)?.alliance_id ?? "";
      if (!allianceId && first) setAllianceId(first);
    }
  }

  async function loadStateUsers() {
    const res = await supabase.rpc("list_state_users", { p_state_code: stateCode });
    if (res.error) { setStatus(res.error.message); return; }
    setStateUsers((res.data ?? []) as any);
  }

  async function loadAllianceUsers(aid: string) {
    if (!aid) { setAllianceUsers([]); return; }
    const res = await supabase.rpc("list_alliance_users", { p_alliance_id: aid });
    if (res.error) { setStatus(res.error.message); return; }
    setAllianceUsers((res.data ?? []) as any);
  }

  async function loadStateGrants() {
    setStatus("Loading state grants…");
    const res = await supabase.from("state_access_grants").select("*").eq("state_code", stateCode).order("updated_at", { ascending: false });
    if (res.error) { setStatus(res.error.message); return; }
    setStateGrants((res.data ?? []) as any);
    setStatus("");
  }

  async function loadAllianceGrants() {
    if (!allianceId) { setAllianceGrants([]); return; }
    setStatus("Loading alliance grants…");
    const res = await supabase.from("alliance_access_grants").select("*").eq("alliance_id", allianceId).order("updated_at", { ascending: false });
    if (res.error) { setStatus(res.error.message); return; }
    setAllianceGrants((res.data ?? []) as any);
    setStatus("");
  }

  useEffect(() => {
    void loadDirectory();
    void loadStateUsers();
    void loadStateGrants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateCode]);

  useEffect(() => {
    void loadAllianceUsers(allianceId);
    void loadAllianceGrants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allianceId]);

  function upsertLocalStateGrant(user_id: string, patch: Partial<StateGrant>) {
    setStateGrants((prev) => {
      const idx = prev.findIndex((g) => g.user_id === user_id && g.state_code === stateCode);
      if (idx >= 0) {
        const copy = prev.slice();
        copy[idx] = { ...copy[idx], ...patch };
        return copy;
      }
      const base: StateGrant = {
        state_code: stateCode,
        user_id,
        can_view: true,
        can_edit: false,
        can_manage_directory: false,
        can_manage_mail: false,
        can_manage_state_alerts: false,
        can_manage_discussion: false,
        can_manage_live_ops: false,
      };
      return [{ ...base, ...patch }, ...prev];
    });
  }

  function upsertLocalAllianceGrant(user_id: string, patch: Partial<AllianceGrant>) {
    setAllianceGrants((prev) => {
      const idx = prev.findIndex((g) => g.user_id === user_id && g.alliance_id === allianceId);
      if (idx >= 0) {
        const copy = prev.slice();
        copy[idx] = { ...copy[idx], ...patch };
        return copy;
      }
      const base: AllianceGrant = {
        alliance_id: allianceId,
        user_id,
        can_view_alerts: true,
        can_post_alerts: false,
        can_manage_alerts: false,
      };
      return [{ ...base, ...patch }, ...prev];
    });
  }

  async function saveStateGrants() {
    setStatus("Saving state grants…");
    const payload = stateGrants
      .filter((g) => g.state_code === stateCode && g.user_id)
      .map((g) => ({ ...g, state_code: g.state_code.trim(), user_id: g.user_id.trim() }));
    const res = await supabase.from("state_access_grants").upsert(payload, { onConflict: "state_code,user_id" });
    if (res.error) { setStatus(res.error.message); return; }
    await loadStateGrants();
    await loadStateUsers();
    setStatus("Saved ✅");
    window.setTimeout(() => setStatus(""), 900);
  }

  async function saveAllianceGrants() {
    if (!allianceId) return;
    setStatus("Saving alliance grants…");
    const payload = allianceGrants
      .filter((g) => g.alliance_id === allianceId && g.user_id)
      .map((g) => ({ ...g, alliance_id: g.alliance_id.trim(), user_id: g.user_id.trim() }));
    const res = await supabase.from("alliance_access_grants").upsert(payload, { onConflict: "alliance_id,user_id" });
    if (res.error) { setStatus(res.error.message); return; }
    await loadAllianceGrants();
    await loadAllianceUsers(allianceId);
    setStatus("Saved ✅");
    window.setTimeout(() => setStatus(""), 900);
  }

  async function deleteStateGrant(user_id: string) {
    const ok = confirm("Delete this state grant?");
    if (!ok) return;
    const res = await supabase.from("state_access_grants").delete().eq("state_code", stateCode).eq("user_id", user_id);
    if (res.error) { setStatus(res.error.message); return; }
    await loadStateGrants();
  }

  async function deleteAllianceGrant(user_id: string) {
    const ok = confirm("Delete this alliance grant?");
    if (!ok) return;
    const res = await supabase.from("alliance_access_grants").delete().eq("alliance_id", allianceId).eq("user_id", user_id);
    if (res.error) { setStatus(res.error.message); return; }
    await loadAllianceGrants();
  }

  const allianceLabel = useMemo(() => {
    const d = directory.find((x) => x.alliance_id === allianceId);
    if (!d) return allianceId ? allianceId.slice(0, 8) + "…" : "";
    return `${d.alliance_code}${d.tag ? ` [${d.tag}]` : ""}${d.name ? ` — ${d.name}` : ""}`;
  }, [directory, allianceId]);

  function exportJson() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      state_code: stateCode,
      state_access_grants: stateGrants.filter((g) => g.state_code === stateCode),
      alliance_context: { alliance_id: allianceId, label: allianceLabel },
      alliance_access_grants: allianceGrants.filter((g) => g.alliance_id === allianceId),
    };
    downloadText(`permissions-matrix-${stateCode}.json`, JSON.stringify(payload, null, 2));
  }

  function importJson(file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const obj = JSON.parse(String(reader.result ?? "{}"));
        const sg = Array.isArray(obj.state_access_grants) ? obj.state_access_grants : [];
        const ag = Array.isArray(obj.alliance_access_grants) ? obj.alliance_access_grants : [];

        setStatus("Importing…");

        if (sg.length) {
          const payload = sg.map((g: any) => ({ ...g, state_code: String(g.state_code ?? stateCode), user_id: String(g.user_id ?? "") })).filter((g: any) => g.user_id);
          const res = await supabase.from("state_access_grants").upsert(payload, { onConflict: "state_code,user_id" });
          if (res.error) throw res.error;
        }

        if (ag.length) {
          const payload = ag.map((g: any) => ({ ...g, alliance_id: String(g.alliance_id ?? allianceId), user_id: String(g.user_id ?? "") })).filter((g: any) => g.user_id && g.alliance_id);
          const res = await supabase.from("alliance_access_grants").upsert(payload, { onConflict: "alliance_id,user_id" });
          if (res.error) throw res.error;
        }

        await loadStateGrants();
        await loadAllianceGrants();
        await loadStateUsers();
        await loadAllianceUsers(allianceId);

        setStatus("Imported ✅");
        window.setTimeout(() => setStatus(""), 1000);
      } catch (e: any) {
        setStatus("Import failed: " + String(e?.message ?? e));
      }
    };
    reader.readAsText(file);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1300, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>Permissions Matrix (V2)</h1>
      <div style={{ opacity: 0.8, marginTop: 6 }}>{status ? status : "DB-backed grants. Owner/admin only."}</div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
        <button onClick={() => setTab("state")} disabled={tab === "state"}>State</button>
        <button onClick={() => setTab("alliance")} disabled={tab === "alliance"}>Alliance</button>
        <button onClick={() => setTab("export")} disabled={tab === "export"}>Export/Import</button>

        <span style={{ opacity: 0.7 }}>• State</span>
        <input value={stateCode} onChange={(e) => setStateCode(e.target.value)} style={{ width: 90 }} />
        <button onClick={() => { void loadStateUsers(); void loadStateGrants(); void loadDirectory(); }}>Reload</button>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      {tab === "state" ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <select value={addStateUserId} onChange={(e) => setAddStateUserId(e.target.value)} style={{ minWidth: 320 }}>
              <option value="">(add user from state roster)</option>
              {stateUsers.map((u) => <option key={u.user_id} value={u.user_id}>{u.display_name} • {u.user_id.slice(0, 8)}…</option>)}
            </select>
            <button onClick={() => { if (addStateUserId) { upsertLocalStateGrant(addStateUserId, { can_view: true }); setAddStateUserId(""); } }}>
              + Add
            </button>
            <button onClick={saveStateGrants}>Save</button>
          </div>

          {stateGrants
            .filter((g) => g.state_code === stateCode)
            .map((g) => (
              <div key={g.user_id} style={{ border: "1px solid #333", borderRadius: 12, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 900 }}>
                    {g.user_id.slice(0, 8)}…
                  </div>
                  <button onClick={() => deleteStateGrant(g.user_id)}>Delete</button>
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
                  {([
                    "can_view",
                    "can_edit",
                    "can_manage_directory",
                    "can_manage_mail",
                    "can_manage_state_alerts",
                    "can_manage_discussion",
                    "can_manage_live_ops",
                  ] as const).map((k) => (
                    <label key={k} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={!!(g as any)[k]}
                        onChange={(e) => upsertLocalStateGrant(g.user_id, { [k]: e.target.checked } as any)}
                      />
                      {k}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          {stateGrants.filter((g) => g.state_code === stateCode).length === 0 ? <div style={{ opacity: 0.75 }}>No state grants.</div> : null}
        </div>
      ) : null}

      {tab === "alliance" ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <select value={allianceId} onChange={(e) => setAllianceId(e.target.value)} style={{ minWidth: 420 }}>
              <option value="">(select alliance)</option>
              {directory.filter((d) => !!d.alliance_id).map((d) => (
                <option key={d.id} value={d.alliance_id!}>
                  {d.alliance_code}{d.tag ? ` [${d.tag}]` : ""}{d.name ? ` — ${d.name}` : ""}
                </option>
              ))}
            </select>

            <select value={addAllianceUserId} onChange={(e) => setAddAllianceUserId(e.target.value)} style={{ minWidth: 320 }} disabled={!allianceId}>
              <option value="">(add user from alliance roster)</option>
              {allianceUsers.map((u) => <option key={u.user_id} value={u.user_id}>{u.display_name} • {u.user_id.slice(0, 8)}…</option>)}
            </select>

            <button onClick={() => { if (allianceId && addAllianceUserId) { upsertLocalAllianceGrant(addAllianceUserId, { can_view_alerts: true }); setAddAllianceUserId(""); } }} disabled={!allianceId}>
              + Add
            </button>
            <button onClick={saveAllianceGrants} disabled={!allianceId}>Save</button>
          </div>

          <div style={{ opacity: 0.75 }}>Alliance: <b>{allianceLabel || "(none)"}</b></div>

          {allianceGrants
            .filter((g) => g.alliance_id === allianceId)
            .map((g) => (
              <div key={g.user_id} style={{ border: "1px solid #333", borderRadius: 12, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 900 }}>
                    {g.user_id.slice(0, 8)}…
                  </div>
                  <button onClick={() => deleteAllianceGrant(g.user_id)}>Delete</button>
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
                  {([
                    "can_view_alerts",
                    "can_post_alerts",
                    "can_manage_alerts",
                  ] as const).map((k) => (
                    <label key={k} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={!!(g as any)[k]}
                        onChange={(e) => upsertLocalAllianceGrant(g.user_id, { [k]: e.target.checked } as any)}
                      />
                      {k}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          {allianceId && allianceGrants.filter((g) => g.alliance_id === allianceId).length === 0 ? <div style={{ opacity: 0.75 }}>No alliance grants.</div> : null}
        </div>
      ) : null}

      {tab === "export" ? (
        <div style={{ border: "1px solid #333", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 900 }}>Export / Import</div>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            Exports state grants for <b>{stateCode}</b> and alliance grants for the currently selected alliance.
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
            <button onClick={exportJson}>Export JSON</button>

            <label style={{ cursor: "pointer" }}>
              <input
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importJson(f);
                  e.currentTarget.value = "";
                }}
              />
              <span style={{ padding: "6px 10px", border: "1px solid #666", borderRadius: 8 }}>Import JSON</span>
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
