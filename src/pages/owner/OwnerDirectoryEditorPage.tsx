import React, { useMemo, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";
import {
  exportAllianceDirectory,
  importAllianceDirectory,
  loadAllianceDirectory,
  normalizeCode,
  removeAllianceByCode,
  upsertAlliance,
} from "../../lib/allianceDirectoryStore";

type Row = {
  id: string;
  code: string;
  name: string;
  state: string;
  active: boolean;
  notes?: string | null;
  createdUtc: string;
  updatedUtc: string;
};

export default function OwnerDirectoryEditorPage() {
  const [tick, setTick] = useState(0);
  const store = useMemo(() => loadAllianceDirectory(), [tick]);
  const rows = useMemo(() => (store.items || []) as Row[], [store.items]);

  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = (q || "").trim().toLowerCase();
    const arr = rows.slice();
    if (!s) return arr.sort((a, b) => a.code.localeCompare(b.code));
    return arr
      .filter((x) => `${x.code} ${x.name} ${x.state} ${x.notes || ""}`.toLowerCase().includes(s))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [rows, q]);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState("789");
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState("");

  const [editCode, setEditCode] = useState<string | null>(null);

  function resetForm() {
    setEditCode(null);
    setCode("");
    setName("");
    setState("789");
    setActive(true);
    setNotes("");
  }

  function startEdit(r: Row) {
    setEditCode(r.code);
    setCode(r.code);
    setName(r.name || "");
    setState(r.state || "789");
    setActive(r.active !== false);
    setNotes((r.notes || "") as any);
  }

  function save() {
    const c = normalizeCode(code);
    if (!c) return alert("Alliance code required (e.g. WOC).");
    upsertAlliance({
      code: c,
      name: name || c,
      state: state || "789",
      active: !!active,
      notes: (notes || "").trim() || null,
    });
    setTick((x) => x + 1);
    setEditCode(c);
    setCode(c);
  }

  function del(c: string) {
    if (!confirm("Delete alliance " + c + " from directory?")) return;
    removeAllianceByCode(c);
    setTick((x) => x + 1);
    if (editCode === c) resetForm();
  }

  async function copyExport() {
    const txt = exportAllianceDirectory();
    try { await navigator.clipboard.writeText(txt); alert("Copied directory export JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  function doImport() {
    const raw = window.prompt("Paste directory export JSON:");
    if (!raw) return;
    const ok = importAllianceDirectory(raw);
    if (!ok) return alert("Invalid JSON.");
    setTick((x) => x + 1);
    alert("Imported.");
  }

  function clearAll() {
    if (!confirm("Clear ALL directory entries?")) return;
    try { localStorage.removeItem("sad_alliance_directory_v1"); } catch {}
    setTick((x) => x + 1);
    resetForm();
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>📚 Owner — Alliance Directory Editor (UI-only)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => setTick((x) => x + 1)}>Refresh</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={copyExport}>Export</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={doImport}>Import</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={clearAll}>Clear</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input className="zombie-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" style={{ padding: "10px 12px", minWidth: 240, flex: 1 }} />
          <div style={{ marginLeft: "auto", opacity: 0.65, fontSize: 12 }}>
            Key: sad_alliance_directory_v1 • Count: {rows.length}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(340px, 1.1fr)", gap: 12 }}>
        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>Directory</div>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {filtered.map((r) => (
              <div key={r.code} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontWeight: 900 }}>
                    {r.active ? "🟢" : "⚫"} {r.code} — {r.name}
                  </div>
                  <div style={{ marginLeft: "auto", opacity: 0.7, fontSize: 12 }}>State: {r.state}</div>
                </div>
                {r.notes ? <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>{r.notes}</div> : null}
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => startEdit(r)}>Edit</button>
                  <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => del(r.code)}>Delete</button>
                </div>
              </div>
            ))}
            {filtered.length === 0 ? <div style={{ opacity: 0.75 }}>No entries.</div> : null}
          </div>
        </div>

        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>{editCode ? ("Edit: " + editCode) : "Add Alliance"}</div>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            <div>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Code (required)</div>
              <input className="zombie-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="WOC" style={{ width: "100%", padding: "10px 12px" }} />
            </div>

            <div>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Name</div>
              <input className="zombie-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Warriors of Chaos" style={{ width: "100%", padding: "10px 12px" }} />
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>State</div>
                <input className="zombie-input" value={state} onChange={(e) => setState(e.target.value)} placeholder="789" style={{ width: "100%", padding: "10px 12px" }} />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Active</div>
                <label style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                  <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                  {active ? "Active" : "Inactive"}
                </label>
              </div>
            </div>

            <div>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Notes</div>
              <textarea className="zombie-input" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: "100%", minHeight: 120, padding: "10px 12px" }} />
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={save}>{editCode ? "Save" : "Add"}</button>
              <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={resetForm}>Clear</button>
              <div style={{ opacity: 0.65, fontSize: 12, alignSelf: "center" }}>
                This feeds: /alliances, /owner/jump, and any jump lists reading the directory key.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}