import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type AllianceItem = {
  id: string;
  code: string;
  name: string;
  state: string;
};

type Store = {
  version: 1;
  updatedUtc: string;
  items: AllianceItem[];
};

const KEY = "sad_alliance_directory_v1";

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function nowUtc() {
  return new Date().toISOString();
}

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Store;
      if (s && s.version === 1 && Array.isArray(s.items)) return s;
    }
  } catch {}
  return { version: 1, updatedUtc: nowUtc(), items: [] };
}

function saveStore(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

export default function OwnerAllianceDirectoryEditorPage() {
  const nav = useNavigate();
  const [store, setStore] = useState<Store>(() => loadStore());
  const [q, setQ] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const editing = useMemo(() => (editId ? store.items.find((x) => x.id === editId) || null : null), [editId, store.items]);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState("789");

  useEffect(() => {
    saveStore(store);
  }, [store]);

  useEffect(() => {
    if (!editing) {
      setCode("");
      setName("");
      setState("789");
    } else {
      setCode(editing.code || "");
      setName(editing.name || "");
      setState(editing.state || "789");
    }
  }, [editId]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const arr = store.items || [];
    if (!qq) return arr;
    return arr.filter((x) => (x.code || "").toLowerCase().includes(qq) || (x.name || "").toLowerCase().includes(qq) || (x.state || "").toLowerCase().includes(qq));
  }, [store.items, q]);

  function newItem() {
    setEditId(null);
  }

  function saveItem() {
    const c = code.trim().toUpperCase();
    if (!c) return window.alert("Alliance code is required.");
    const n = name.trim() || c;
    const st = state.trim() || "789";

    const next: Store = { ...store, updatedUtc: nowUtc(), items: [...(store.items || [])] };

    if (!editId) {
      if (next.items.some((x) => String(x.code).toUpperCase() === c)) {
        return window.alert("That code already exists.");
      }
      next.items.unshift({ id: uid(), code: c, name: n, state: st });
      setStore(next);
      return;
    }

    next.items = next.items.map((x) => (x.id === editId ? { ...x, code: c, name: n, state: st } : x));
    setStore(next);
  }

  function del(id: string) {
    if (!window.confirm("Delete this alliance from directory (UI-only)?")) return;
    const next: Store = { ...store, updatedUtc: nowUtc(), items: (store.items || []).filter((x) => x.id !== id) };
    setStore(next);
    if (editId === id) setEditId(null);
  }

  async function copyJson() {
    const txt = JSON.stringify(store, null, 2);
    try {
      await navigator.clipboard.writeText(txt);
      window.alert("Copied directory JSON.");
    } catch {
      window.prompt("Copy JSON:", txt);
    }
  }

  function importJson() {
    const raw = window.prompt("Paste directory JSON:");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Store;
      const items = Array.isArray(parsed.items) ? parsed.items : [];
      const cleaned: AllianceItem[] = items
        .filter((x: any) => x && x.code)
        .map((x: any) => ({
          id: String(x.id || uid()),
          code: String(x.code).toUpperCase(),
          name: String(x.name || x.code).trim(),
          state: String(x.state || "789").trim(),
        }));
      setStore({ version: 1, updatedUtc: nowUtc(), items: cleaned });
      window.alert("Imported directory.");
    } catch {
      window.alert("Invalid JSON.");
    }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🗂️ Owner — Alliance Directory Editor (UI-only)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => nav("/alliances")}>
            Open Directory Page
          </button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={copyJson}>
            Copy JSON
          </button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={importJson}>
            Import JSON
          </button>
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input className="zombie-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" style={{ padding: "10px 12px", minWidth: 220 }} />
          <div style={{ opacity: 0.75, fontSize: 12 }}>Items: {store.items.length}</div>
          <div style={{ opacity: 0.75, fontSize: 12 }}>Updated (UTC): {store.updatedUtc}</div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(300px, 1.1fr)", gap: 12 }}>
        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>Directory List</div>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {filtered.map((x) => {
              const sel = x.id === editId;
              return (
                <div
                  key={x.id}
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: sel ? "rgba(120,255,120,0.10)" : "rgba(0,0,0,0.20)",
                    cursor: "pointer",
                  }}
                  onClick={() => setEditId(x.id)}
                >
                  <div style={{ fontWeight: 900 }}>{x.code}</div>
                  <div style={{ opacity: 0.85, marginTop: 4 }}>{x.name}</div>
                  <div style={{ opacity: 0.65, fontSize: 12, marginTop: 4 }}>State: {x.state || "—"}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={(ev) => { ev.stopPropagation(); nav("/dashboard/" + x.code); }}>
                      Open Dashboard
                    </button>
                    <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={(ev) => { ev.stopPropagation(); del(x.id); }}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 ? <div style={{ opacity: 0.75 }}>No matches.</div> : null}
          </div>
        </div>

        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>{editing ? "Edit Alliance" : "Add Alliance"}</div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Code</div>
            <input className="zombie-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="WOC" style={{ width: "100%", padding: "10px 12px" }} />
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Name</div>
            <input className="zombie-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alliance name…" style={{ width: "100%", padding: "10px 12px" }} />
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>State</div>
            <input className="zombie-input" value={state} onChange={(e) => setState(e.target.value)} placeholder="789" style={{ width: "100%", padding: "10px 12px" }} />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={saveItem}>
              Save
            </button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={newItem}>
              Clear
            </button>
          </div>

          <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
            UI-only. Directory page reads this localStorage store.
          </div>
        </div>
      </div>
    </div>
  );
}