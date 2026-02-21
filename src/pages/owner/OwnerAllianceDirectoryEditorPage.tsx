import React, { useEffect, useMemo, useState } from "react";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type DirItem = {
  id: string;
  code: string;
  name: string;
  state: string;
  createdUtc: string;
  updatedUtc: string;
};

type Store = {
  version: 1;
  updatedUtc: string;
  items: DirItem[];
};

const KEY = "sad_alliance_directory_v1";

function uid() { return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16); }
function nowUtc() { return new Date().toISOString(); }

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as any;
      const items = Array.isArray(s?.items) ? s.items : [];
      return {
        version: 1,
        updatedUtc: String(s?.updatedUtc || nowUtc()),
        items: items.map((x: any) => ({
          id: String(x?.id || uid()),
          code: String(x?.code || "").toUpperCase(),
          name: String(x?.name || x?.code || ""),
          state: String(x?.state || "789"),
          createdUtc: String(x?.createdUtc || nowUtc()),
          updatedUtc: String(x?.updatedUtc || nowUtc()),
        })).filter((x: DirItem) => x.code),
      };
    }
  } catch {}
  return { version: 1, updatedUtc: nowUtc(), items: [] };
}

function saveStore(s: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export default function OwnerAllianceDirectoryEditorPage() {
  const [store, setStore] = useState<Store>(() => loadStore());
  useEffect(() => saveStore(store), [store]);

  const items = useMemo(() => {
    const arr = (store.items || []).slice();
    arr.sort((a, b) => a.code.localeCompare(b.code));
    return arr;
  }, [store.items]);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState("789");

  const [editId, setEditId] = useState<string | null>(null);
  const editing = useMemo(() => (editId ? items.find((x) => x.id === editId) || null : null), [editId, items]);

  useEffect(() => {
    if (!editing) return;
    setCode(editing.code || "");
    setName(editing.name || "");
    setState(editing.state || "789");
  }, [editId]);

  function resetForm() {
    setEditId(null);
    setCode("");
    setName("");
    setState("789");
  }

  function upsert() {
    const c = (code || "").trim().toUpperCase();
    if (!c) return alert("Alliance code required (e.g. WOC).");
    if (c.length > 12) return alert("Code too long.");

    const n = (name || "").trim() || c;
    const st = (state || "").trim() || "789";
    const now = nowUtc();

    setStore((p) => {
      const next: Store = { version: 1, updatedUtc: now, items: [...(p.items || [])] };

      // If editing, update by id; else upsert by code
      if (editId) {
        const idx = next.items.findIndex((x) => x.id === editId);
        if (idx >= 0) {
          next.items[idx] = { ...next.items[idx], code: c, name: n, state: st, updatedUtc: now };
          return next;
        }
      }

      const idx2 = next.items.findIndex((x) => x.code === c);
      if (idx2 >= 0) {
        next.items[idx2] = { ...next.items[idx2], name: n, state: st, updatedUtc: now };
      } else {
        next.items.unshift({ id: uid(), code: c, name: n, state: st, createdUtc: now, updatedUtc: now });
      }
      return next;
    });

    resetForm();
  }

  function remove(id: string) {
    const row = items.find((x) => x.id === id);
    if (!row) return;
    if (!confirm(`Delete alliance ${row.code}?`)) return;

    setStore((p) => ({ version: 1, updatedUtc: nowUtc(), items: (p.items || []).filter((x) => x.id !== id) }));
    if (editId === id) resetForm();
  }

  function pickEdit(id: string) {
    setEditId(id);
  }

  async function exportJson() {
    const txt = JSON.stringify({ ...store, exportedUtc: nowUtc() }, null, 2);
    try { await navigator.clipboard.writeText(txt); alert("Copied directory JSON."); }
    catch { window.prompt("Copy:", txt); }
  }

  function importJson() {
    const raw = window.prompt("Paste directory JSON:");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      if (p?.version !== 1 || !Array.isArray(p.items)) throw new Error("Invalid");
      const now = nowUtc();
      const cleaned = (p.items as any[]).map((x) => ({
        id: String(x?.id || uid()),
        code: String(x?.code || "").toUpperCase(),
        name: String(x?.name || x?.code || ""),
        state: String(x?.state || "789"),
        createdUtc: String(x?.createdUtc || now),
        updatedUtc: String(x?.updatedUtc || now),
      })).filter((x) => x.code);
      setStore({ version: 1, updatedUtc: now, items: cleaned });
      resetForm();
      alert("Imported.");
    } catch {
      alert("Invalid JSON.");
    }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🧟 Owner — Alliance Directory Editor</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={exportJson}>Export</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={importJson}>Import</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>{editing ? `Edit ${editing.code}` : "Add / Update Alliance"}</div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input className="zombie-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code (WOC)" style={{ padding: "10px 12px", minWidth: 140 }} />
          <input className="zombie-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (War of...)" style={{ padding: "10px 12px", minWidth: 240, flex: 1 }} />
          <input className="zombie-input" value={state} onChange={(e) => setState(e.target.value)} placeholder="State (789)" style={{ padding: "10px 12px", minWidth: 140 }} />

          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={upsert}>{editing ? "Save" : "Add/Update"}</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={resetForm}>Clear</button>

          <div style={{ marginLeft: "auto", opacity: 0.7, fontSize: 12 }}>
            Stored in localStorage: {KEY}
          </div>
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Alliances ({items.length})</div>

        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {items.map((a) => (
            <div key={a.id} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>{a.code}</div>
                <div style={{ opacity: 0.85 }}>{a.name}</div>
                <div style={{ marginLeft: "auto", opacity: 0.75, fontSize: 12 }}>State: {a.state}</div>
              </div>
              <div style={{ marginTop: 6, opacity: 0.65, fontSize: 12 }}>
                Updated: {a.updatedUtc}
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => pickEdit(a.id)}>Edit</button>
                <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => remove(a.id)}>Delete</button>
              </div>
            </div>
          ))}
          {items.length === 0 ? <div style={{ opacity: 0.75 }}>No alliances yet. Add one above.</div> : null}
        </div>
      </div>
    </div>
  );
}