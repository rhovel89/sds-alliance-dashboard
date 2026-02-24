import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";

type StateGrant = {
  id?: string;
  state_code: string;
  user_id: string;
  can_view: boolean;
  can_edit: boolean;
  can_manage_directory: boolean;
  can_manage_mail: boolean;
  can_manage_state_alerts: boolean;
};

type AllianceGrant = {
  id?: string;
  alliance_id: string;
  user_id: string;
  can_view_alerts: boolean;
  can_post_alerts: boolean;
  can_manage_alerts: boolean;
};

type DirEntry = {
  alliance_code: string;
  alliance_id: string | null;
  tag: string;
  name: string;
  state_code: string;
};

export default function OwnerPermissionsDbPage() {
  const [tab, setTab] = useState<"state" | "alliance">("state");
  const [stateCode, setStateCode] = useState("789");

  const [stateGrants, setStateGrants] = useState<StateGrant[]>([]);
  const [allianceGrants, setAllianceGrants] = useState<AllianceGrant[]>([]);
  const [directory, setDirectory] = useState<DirEntry[]>([]);

  const [status, setStatus] = useState("");

  async function loadAll() {
    setStatus("Loading…");

    const d = await supabase
      .from("alliance_directory_entries")
      .select("state_code,alliance_code,alliance_id,tag,name")
      .eq("state_code", stateCode)
      .order("sort_order", { ascending: true });

    if (!d.error) setDirectory((d.data ?? []) as any);

    const sg = await supabase
      .from("state_access_grants")
      .select("*")
      .eq("state_code", stateCode)
      .order("updated_at", { ascending: false });

    if (sg.error) { setStatus(sg.error.message); return; }
    setStateGrants((sg.data ?? []) as any);

    const ag = await supabase
      .from("alliance_access_grants")
      .select("*")
      .order("updated_at", { ascending: false });

    if (ag.error) { setStatus(ag.error.message); return; }
    setAllianceGrants((ag.data ?? []) as any);

    setStatus("");
  }

  useEffect(() => { void loadAll(); }, [stateCode]);

  function addStateGrant() {
    setStateGrants((prev) => [
      {
        state_code: stateCode,
        user_id: "",
        can_view: true,
        can_edit: false,
        can_manage_directory: false,
        can_manage_mail: false,
        can_manage_state_alerts: false,
      },
      ...prev,
    ]);
  }

  function addAllianceGrant() {
    setAllianceGrants((prev) => [
      {
        alliance_id: "",
        user_id: "",
        can_view_alerts: true,
        can_post_alerts: false,
        can_manage_alerts: false,
      },
      ...prev,
    ]);
  }

  async function saveState() {
    setStatus("Saving state grants…");
    const payload = stateGrants
      .map((g) => ({ ...g, state_code: g.state_code.trim(), user_id: g.user_id.trim() }))
      .filter((g) => g.state_code && g.user_id);

    const res = await supabase.from("state_access_grants").upsert(payload, { onConflict: "state_code,user_id" }).select("*");
    if (res.error) { setStatus(res.error.message); return; }
    setStateGrants((res.data ?? []) as any);
    setStatus("Saved ✅");
    window.setTimeout(() => setStatus(""), 1200);
  }

  async function saveAlliance() {
    setStatus("Saving alliance grants…");
    const payload = allianceGrants
      .map((g) => ({ ...g, alliance_id: g.alliance_id.trim(), user_id: g.user_id.trim() }))
      .filter((g) => g.alliance_id && g.user_id);

    const res = await supabase.from("alliance_access_grants").upsert(payload, { onConflict: "alliance_id,user_id" }).select("*");
    if (res.error) { setStatus(res.error.message); return; }
    setAllianceGrants((res.data ?? []) as any);
    setStatus("Saved ✅");
    window.setTimeout(() => setStatus(""), 1200);
  }

  async function deleteState(g: StateGrant) {
    const ok = confirm("Delete this state grant?");
    if (!ok || !g.id) return;
    const res = await supabase.from("state_access_grants").delete().eq("id", g.id);
    if (res.error) { setStatus(res.error.message); return; }
    await loadAll();
  }

  async function deleteAlliance(g: AllianceGrant) {
    const ok = confirm("Delete this alliance grant?");
    if (!ok || !g.id) return;
    const res = await supabase.from("alliance_access_grants").delete().eq("id", g.id);
    if (res.error) { setStatus(res.error.message); return; }
    await loadAll();
  }

  const allianceChoices = useMemo(() => {
    return directory.filter((d) => !!d.alliance_id) as any as Array<DirEntry & { alliance_id: string }>;
  }, [directory]);

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>Owner Permissions (DB)</h1>
      <div style={{ opacity: 0.8, marginTop: 6 }}>
        Delegated permissions are enforced by RLS. {status ? " • " + status : ""}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
        <button onClick={() => setTab("state")} disabled={tab === "state"}>State grants</button>
        <button onClick={() => setTab("alliance")} disabled={tab === "alliance"}>Alliance grants</button>

        <span style={{ opacity: 0.7 }}>• State</span>
        <input value={stateCode} onChange={(e) => setStateCode(e.target.value)} style={{ width: 100 }} />
        <button onClick={loadAll}>Reload</button>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      {tab === "state" ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={addStateGrant}>+ Add state grant</button>
            <button onClick={saveState}>Save state grants</button>
          </div>

          {stateGrants.map((g, i) => (
            <div key={g.id ?? i} style={{ border: "1px solid #333", borderRadius: 12, padding: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                <div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>State</div>
                  <input value={g.state_code} onChange={(e) => {
                    const v = e.target.value;
                    setStateGrants((p) => p.map((x, idx) => idx === i ? { ...x, state_code: v } : x));
                  }} />
                </div>
                <div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>User ID (uuid)</div>
                  <input value={g.user_id} onChange={(e) => {
                    const v = e.target.value;
                    setStateGrants((p) => p.map((x, idx) => idx === i ? { ...x, user_id: v } : x));
                  }} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
                {(["can_view","can_edit","can_manage_directory","can_manage_mail","can_manage_state_alerts"] as const).map((k) => (
                  <label key={k} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={!!(g as any)[k]}
                      onChange={(e) => {
                        const v = e.target.checked;
                        setStateGrants((p) => p.map((x, idx) => idx === i ? ({ ...x, [k]: v } as any) : x));
                      }}
                    />
                    {k}
                  </label>
                ))}
                <button onClick={() => deleteState(g)} disabled={!g.id}>Delete</button>
              </div>
            </div>
          ))}
          {stateGrants.length === 0 ? <div style={{ opacity: 0.75 }}>No state grants.</div> : null}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={addAllianceGrant}>+ Add alliance grant</button>
            <button onClick={saveAlliance}>Save alliance grants</button>
          </div>

          <div style={{ opacity: 0.7, fontSize: 12 }}>
            Tip: Pick an alliance_id from the directory (must be UUID).
          </div>

          {allianceGrants.map((g, i) => (
            <div key={g.id ?? i} style={{ border: "1px solid #333", borderRadius: 12, padding: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr", gap: 10 }}>
                <div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>Alliance (choose)</div>
                  <select value={g.alliance_id} onChange={(e) => {
                    const v = e.target.value;
                    setAllianceGrants((p) => p.map((x, idx) => idx === i ? { ...x, alliance_id: v } : x));
                  }}>
                    <option value="">(select)</option>
                    {allianceChoices.map((d) => (
                      <option key={d.alliance_id} value={d.alliance_id}>
                        {d.alliance_code} {d.tag ? `[${d.tag}]` : ""} {d.name}
                      </option>
                    ))}
                  </select>
                  <div style={{ opacity: 0.6, fontSize: 12, marginTop: 6 }}>
                    Or paste alliance_id:
                    <input value={g.alliance_id} onChange={(e) => {
                      const v = e.target.value;
                      setAllianceGrants((p) => p.map((x, idx) => idx === i ? { ...x, alliance_id: v } : x));
                    }} />
                  </div>
                </div>
                <div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>User ID (uuid)</div>
                  <input value={g.user_id} onChange={(e) => {
                    const v = e.target.value;
                    setAllianceGrants((p) => p.map((x, idx) => idx === i ? { ...x, user_id: v } : x));
                  }} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
                {(["can_view_alerts","can_post_alerts","can_manage_alerts"] as const).map((k) => (
                  <label key={k} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={!!(g as any)[k]}
                      onChange={(e) => {
                        const v = e.target.checked;
                        setAllianceGrants((p) => p.map((x, idx) => idx === i ? ({ ...x, [k]: v } as any) : x));
                      }}
                    />
                    {k}
                  </label>
                ))}
                <button onClick={() => deleteAlliance(g)} disabled={!g.id}>Delete</button>
              </div>
            </div>
          ))}
          {allianceGrants.length === 0 ? <div style={{ opacity: 0.75 }}>No alliance grants.</div> : null}
        </div>
      )}
    </div>
  );
}
