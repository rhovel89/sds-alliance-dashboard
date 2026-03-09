import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";
import { supabase } from "../../lib/supabaseClient";

type AnyRow = any;

function s(v: any) {
  return v === null || v === undefined ? "" : String(v);
}
function norm(v: any) {
  return s(v).trim();
}
function normUpper(v: any) {
  return norm(v).toUpperCase();
}

const ROLE_OPTIONS = ["owner", "leader", "r4", "r3", "member", "public"];

function parseRolesCsv(v: any): string[] {
  return String(v || "").split(",").map((x) => x.trim()).filter(Boolean);
}

function rolesToCsv(arr: string[]): string {
  return Array.from(new Set((arr || []).map((x) => String(x || "").trim()).filter(Boolean))).join(",");
}

function toggleRoleInCsv(csv: string, role: string): string {
  const current = parseRolesCsv(csv);
  const next = current.includes(role)
    ? current.filter((x) => x !== role)
    : [...current, role];
  return rolesToCsv(next);
}

export default function OwnerAllianceDashboardLinksPage() {
  const nav = useNavigate();
  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);

  function onSelectModule(k: string) {
    const to = cc.find((m) => m.key === k)?.to;
    if (to) nav(to);
  }

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<AnyRow[]>([]);

  const [allianceCode, setAllianceCode] = useState("WOC");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [rolesCsv, setRolesCsv] = useState("");
  const [sort, setSort] = useState("0");
  const [active, setActive] = useState(true);

  async function loadAll() {
    try {
      setLoading(true);
      setStatus("");

      const r = await supabase
        .from("alliance_dashboard_links")
        .select("*")
        .order("alliance_code", { ascending: true })
        .order("sort", { ascending: true })
        .order("created_at", { ascending: false });

      if (r.error) throw r.error;
      setRows((r.data || []) as AnyRow[]);
    } catch (e: any) {
      setStatus(String(e?.message || e || "Load failed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function createLink() {
    try {
      if (!normUpper(allianceCode)) return setStatus("Alliance code required.");
      if (!norm(label)) return setStatus("Label required.");
      if (!norm(url)) return setStatus("URL required.");

      const ins = await supabase
        .from("alliance_dashboard_links")
        .insert({
          alliance_code: normUpper(allianceCode),
          label: norm(label),
          url: norm(url),
          section_name: norm(sectionName) || null,
          roles_csv: norm(rolesCsv) || null,
          sort: Number(sort || 0),
          active,
        } as any);

      if (ins.error) throw ins.error;

      setLabel("");
      setUrl("");
      setSectionName("");
      setRolesCsv("");
      setSort("0");
      setActive(true);
      setStatus("Dashboard link created ✅");
      await loadAll();
    } catch (e: any) {
      setStatus("Create failed: " + String(e?.message || e || "unknown error"));
    }
  }

  async function saveRow(r: AnyRow) {
    try {
      const up = await supabase
        .from("alliance_dashboard_links")
        .update({
          alliance_code: normUpper(r?.alliance_code),
          label: norm(r?.label),
          url: norm(r?.url),
          section_name: norm(r?.section_name) || null,
          roles_csv: norm(r?.roles_csv) || null,
          sort: Number(r?.sort || 0),
          active: !!r?.active,
        } as any)
        .eq("id", String(r?.id || ""));

      if (up.error) throw up.error;

      setStatus("Saved ✅");
      await loadAll();
    } catch (e: any) {
      setStatus("Save failed: " + String(e?.message || e || "unknown error"));
    }
  }

  async function deleteRow(id: string) {
    try {
      if (!window.confirm("Delete this dashboard link?")) return;

      const del = await supabase
        .from("alliance_dashboard_links")
        .delete()
        .eq("id", id);

      if (del.error) throw del.error;

      setStatus("Deleted ✅");
      await loadAll();
    } catch (e: any) {
      setStatus("Delete failed: " + String(e?.message || e || "unknown error"));
    }
  }

  function patchRow(id: string, patch: AnyRow) {
    setRows((prev) => prev.map((x) => String(x?.id || "") === String(id) ? { ...x, ...patch } : x));
  }

  return (
    <CommandCenterShell
      title="Owner • Alliance Dashboard Links"
      subtitle="Manage owner-controlled links shown on alliance dashboards"
      modules={modules}
      activeModuleKey="owner"
      onSelectModule={onSelectModule}
      topRight={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/search")}>Search</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/state-achievements")}>Achievements</button>
          <button className="zombie-btn" type="button" onClick={() => void loadAll()} disabled={loading}>Refresh</button>
        </div>
      }
    >
      {status ? (
        <div style={{ marginBottom: 10, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 10 }}>
          {status}
        </div>
      ) : null}

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Create Link</div>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input className="zombie-input" value={allianceCode} onChange={(e) => setAllianceCode(e.target.value)} placeholder="Alliance code" style={{ padding: "10px 12px", width: 140 }} />
            <input className="zombie-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" style={{ padding: "10px 12px", minWidth: 220, flex: 1 }} />
            <input className="zombie-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." style={{ padding: "10px 12px", minWidth: 280, flex: 2 }} />
            <input className="zombie-input" value={sectionName} onChange={(e) => setSectionName(e.target.value)} placeholder="Section (Tools, Intel, Ops...)" style={{ padding: "10px 12px", minWidth: 220, flex: 1 }} />
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <input className="zombie-input" value={rolesCsv} onChange={(e) => setRolesCsv(e.target.value)} placeholder="roles_csv (owner,leader,r4)" style={{ padding: "10px 12px", minWidth: 260, flex: 1 }} />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ROLE_OPTIONS.map((role) => {
                const checked = parseRolesCsv(rolesCsv).includes(role);
                return (
                  <label key={role} style={{ display: "flex", gap: 6, alignItems: "center", padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)", background: checked ? "rgba(255,255,255,0.08)" : "transparent" }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setRolesCsv(toggleRoleInCsv(rolesCsv, role))}
                    />
                    {role}
                  </label>
                );
              })}
              <button
                className="zombie-btn"
                type="button"
                style={{ padding: "6px 10px" }}
                onClick={() => setRolesCsv("")}
              >
                Clear Roles
              </button>
            </div>

            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {parseRolesCsv(rolesCsv).length === 0 ? "Visible to all roles" : `Selected roles: ${parseRolesCsv(rolesCsv).join(", ")}`}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input className="zombie-input" value={sort} onChange={(e) => setSort(e.target.value)} placeholder="sort" style={{ padding: "10px 12px", width: 100 }} />
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                active
              </label>
              <button className="zombie-btn" type="button" style={{ padding: "10px 12px" }} onClick={() => void createLink()}>
                Create
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Existing Links</div>
        <div style={{ display: "grid", gap: 10 }}>
          {rows.length === 0 ? <div style={{ opacity: 0.7 }}>No dashboard links yet.</div> : rows.map((r) => (
            <div key={String(r?.id || "")} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input className="zombie-input" value={String(r?.alliance_code || "")} onChange={(e) => patchRow(r.id, { alliance_code: e.target.value })} style={{ padding: "8px 10px", width: 140 }} />
                  <input className="zombie-input" value={String(r?.label || "")} onChange={(e) => patchRow(r.id, { label: e.target.value })} style={{ padding: "8px 10px", minWidth: 220, flex: 1 }} />
                  <input className="zombie-input" value={String(r?.url || "")} onChange={(e) => patchRow(r.id, { url: e.target.value })} style={{ padding: "8px 10px", minWidth: 280, flex: 2 }} />
                  <input className="zombie-input" value={String(r?.section_name || "")} onChange={(e) => patchRow(r.id, { section_name: e.target.value })} placeholder="Section" style={{ padding: "8px 10px", minWidth: 180, flex: 1 }} />
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ minWidth: 240, flex: 1 }}>
                    <input className="zombie-input" value={String(r?.roles_csv || "")} onChange={(e) => patchRow(r.id, { roles_csv: e.target.value })} placeholder="roles_csv" style={{ padding: "8px 10px", width: "100%" }} />

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      {ROLE_OPTIONS.map((role) => {
                        const checked = parseRolesCsv(r?.roles_csv).includes(role);
                        return (
                          <label key={role} style={{ display: "flex", gap: 6, alignItems: "center", padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)", background: checked ? "rgba(255,255,255,0.08)" : "transparent" }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => patchRow(r.id, { roles_csv: toggleRoleInCsv(String(r?.roles_csv || ""), role) })}
                            />
                            {role}
                          </label>
                        );
                      })}

                      <button
                        className="zombie-btn"
                        type="button"
                        style={{ padding: "4px 8px", fontSize: 12 }}
                        onClick={() => patchRow(r.id, { roles_csv: "" })}
                      >
                        Clear Roles
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      {parseRolesCsv(r?.roles_csv).length === 0 ? <span style={{ opacity: 0.65, fontSize: 12 }}>Visible to all roles</span> : parseRolesCsv(r?.roles_csv).map((role) => (
                        <span key={role} style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)" }}>{role}</span>
                      ))}
                    </div>
                  </div>
                  <input className="zombie-input" value={String(r?.sort ?? 0)} onChange={(e) => patchRow(r.id, { sort: e.target.value })} style={{ padding: "8px 10px", width: 100 }} />
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="checkbox" checked={!!r?.active} onChange={(e) => patchRow(r.id, { active: e.target.checked })} />
                    active
                  </label>
                  <a className="zombie-btn" href={String(r?.url || "#")} target="_blank" rel="noreferrer" style={{ padding: "8px 10px", textDecoration: "none" }}>Preview</a>
                  <button className="zombie-btn" type="button" style={{ padding: "8px 10px" }} onClick={() => void saveRow(r)}>Save</button>
                  <button className="zombie-btn" type="button" style={{ padding: "8px 10px" }} onClick={() => void deleteRow(String(r?.id || ""))}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </CommandCenterShell>
  );
}






