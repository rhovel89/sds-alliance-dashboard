import React, { useEffect, useMemo, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";
import { supabase } from "../../lib/supabaseClient";
import {
  SatRequest,
  SatType,
  SatOption,
  getAccess,
  getStateOptions,
  getStateRequests,
  getStateTypes,
  updateRequest,
  deleteRequest,
  exportSatState,
  importSatState,
} from "../../lib/stateAchievementsLocalStore";

const STATE = "789";

function lower(s: any) { return String(s || "").trim().toLowerCase(); }
function norm(s: any) { return String(s || "").trim(); }
function nowUtc() { return new Date().toISOString(); }

export default function OwnerStateAchievementRequestsPage() {
  const [meId, setMeId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  const [types, setTypes] = useState<SatType[]>(() => getStateTypes(STATE));
  const [opts, setOpts] = useState<SatOption[]>(() => getStateOptions(STATE));
  const [reqs, setReqs] = useState<SatRequest[]>(() => getStateRequests(STATE));

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const u = await supabase.auth.getUser();
        setMeId(u.data.user?.id || null);
      } catch {
        setMeId(null);
      }
      try {
        const r = await supabase.rpc("is_dashboard_owner" as any);
        setIsOwner(r.data === true && !r.error);
      } catch {
        setIsOwner(false);
      }
    })();
  }, []);

  function reload() {
    setTypes(getStateTypes(STATE));
    setOpts(getStateOptions(STATE));
    setReqs(getStateRequests(STATE));
  }

  const typeMap = useMemo(() => {
    const m: Record<string, SatType> = {};
    for (const t of types) m[t.id] = t;
    return m;
  }, [types]);

  const optMap = useMemo(() => {
    const m: Record<string, SatOption> = {};
    for (const o of opts) m[o.id] = o;
    return m;
  }, [opts]);

  const access = useMemo(() => getAccess(STATE), [meId, reqs]);

  const canView = useMemo(() => {
    if (isOwner) return true;
    if (!meId) return false;
    return (access.canViewUserIds || []).includes(meId) || (access.canEditUserIds || []).includes(meId);
  }, [isOwner, meId, access]);

  const canEdit = useMemo(() => {
    if (isOwner) return true;
    if (!meId) return false;
    return (access.canEditUserIds || []).includes(meId);
  }, [isOwner, meId, access]);

  const filtered = useMemo(() => {
    const s = lower(q);
    return (reqs || []).filter((r) => {
      if (status && r.status !== status) return false;
      if (!s) return true;
      const t = typeMap[r.typeId]?.name || r.typeId;
      const o = r.optionId ? (optMap[r.optionId]?.label || "") : "";
      return (
        lower(r.playerName).includes(s) ||
        lower(r.allianceName).includes(s) ||
        lower(t).includes(s) ||
        lower(o).includes(s) ||
        lower(r.status).includes(s)
      );
    });
  }, [reqs, q, status, typeMap, optMap]);

  function bump(id: string, delta: number) {
    if (!canEdit) return alert("No edit permission.");
    const r = reqs.find(x => x.id === id);
    if (!r) return;
    const next = Math.max(0, Number(r.currentCount || 0) + delta);
    updateRequest(id, { currentCount: next });
    reload();
  }

  function setRequestStatus(id: string, st: string) {
    if (!canEdit) return alert("No edit permission.");
    updateRequest(id, { status: st as any });
    reload();
  }

  function setNotes(id: string, notes: string) {
    if (!canEdit) return alert("No edit permission.");
    updateRequest(id, { notes });
    reload();
  }

  function remove(id: string) {
    if (!canEdit) return alert("No edit permission.");
    if (!confirm("Delete this request?")) return;
    deleteRequest(id);
    reload();
  }

  async function copyExport() {
    const payload = exportSatState(STATE);
    const txt = JSON.stringify(payload, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied export JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  function doImport() {
    if (!canEdit) return alert("No edit permission.");
    const raw = window.prompt("Paste export JSON:");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      importSatState(p);
      reload();
      alert("Imported.");
    } catch (e: any) {
      alert("Import failed: " + (e?.message || String(e)));
    }
  }

  if (!canView) {
    return (
      <div style={{ padding: 14 }}>
        <h2 style={{ margin: 0 }}>🏆 Owner — Achievement Requests</h2>
        <div className="zombie-card" style={{ marginTop: 12, border: "1px solid rgba(255,120,120,0.35)" }}>
          <div style={{ fontWeight: 900, color: "#ffb3b3" }}>No Access</div>
          <div style={{ marginTop: 8, opacity: 0.8 }}>
            You are not allowed to view this page. Owner can grant access in:
            <div style={{ marginTop: 6, fontFamily: "monospace" }}>/owner/state-achievement-catalog</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🏆 Owner — Achievement Requests (Local)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={reload}>Reload</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={copyExport}>Export</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={doImport} disabled={!canEdit}>Import</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ opacity: 0.7, fontSize: 12 }}>
          You: {meId || "(not signed in)"} • canEdit={String(canEdit)} • storage=localStorage
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input className="zombie-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search player/alliance/type/weapon…" style={{ padding: "10px 12px", flex: 1, minWidth: 240 }} />
          <select className="zombie-input" value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: "10px 12px" }}>
            <option value="">All statuses</option>
            <option value="pending">pending</option>
            <option value="in_progress">in_progress</option>
            <option value="completed">completed</option>
            <option value="denied">denied</option>
          </select>
          <div style={{ opacity: 0.7, fontSize: 12 }}>Showing: {filtered.length}</div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {filtered.map((r) => {
          const t = typeMap[r.typeId];
          const opt = r.optionId ? optMap[r.optionId] : null;
          const reqCount = Math.max(1, Number(r.requiredCount || t?.requiredCount || 1));
          const cur = Math.max(0, Number(r.currentCount || 0));
          const done = cur >= reqCount;

          return (
            <div key={r.id} className="zombie-card">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>{r.playerName}</div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>({r.allianceName})</div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>• {t?.name || r.typeId}</div>
                {opt ? <div style={{ opacity: 0.75, fontSize: 12 }}>• {opt.label}</div> : null}
                <div style={{ marginLeft: "auto", opacity: 0.9, fontSize: 12 }}>
                  {cur}/{reqCount} {done ? "✅" : ""}
                </div>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ opacity: 0.7, fontSize: 12 }}>Status</div>
                <select className="zombie-input" value={r.status} onChange={(e) => setRequestStatus(r.id, e.target.value)} disabled={!canEdit} style={{ padding: "8px 10px" }}>
                  <option value="pending">pending</option>
                  <option value="in_progress">in_progress</option>
                  <option value="completed">completed</option>
                  <option value="denied">denied</option>
                </select>

                <button className="zombie-btn" style={{ padding: "8px 10px" }} onClick={() => bump(r.id, -1)} disabled={!canEdit}>-1</button>
                <button className="zombie-btn" style={{ padding: "8px 10px" }} onClick={() => bump(r.id, +1)} disabled={!canEdit}>+1</button>

                <button className="zombie-btn" style={{ padding: "8px 10px" }} onClick={() => remove(r.id)} disabled={!canEdit}>Delete</button>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ opacity: 0.7, fontSize: 12, marginBottom: 6 }}>Notes</div>
                <textarea
                  className="zombie-input"
                  defaultValue={r.notes || ""}
                  onBlur={(e) => setNotes(r.id, e.target.value)}
                  disabled={!canEdit}
                  style={{ width: "100%", minHeight: 70, padding: "10px 12px" }}
                />
              </div>

              <div style={{ marginTop: 8, opacity: 0.65, fontSize: 12 }}>
                created={r.createdUtc} • updated={r.updatedUtc} {r.completedUtc ? `• completed=${r.completedUtc}` : ""}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 ? <div style={{ opacity: 0.75 }}>No requests yet.</div> : null}
      </div>
    </div>
  );
}