import React, { useMemo, useState } from "react";

type Bundle = {
  version: 1;
  exportedAt: string;
  app: "state-alliance-dashboard";
  items: Record<string, string>;
};

function nowIso() {
  return new Date().toISOString();
}

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

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readAllKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k) keys.push(k);
  }
  keys.sort();
  return keys;
}

function bytesApprox(s: string) {
  // rough: JS string length in UTF-16; display as chars (good enough for admin)
  return s.length;
}

function preview(s: string, n = 90) {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    alert("Copied to clipboard");
  } catch {
    alert("Copy failed (clipboard permission).");
  }
}

export default function OwnerDataVaultPage() {
  const [onlySad, setOnlySad] = useState(true);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const keys = useMemo(() => {
    const all = readAllKeys();
    const base = onlySad ? all.filter((k) => k.startsWith("sad_")) : all;
    const q = filter.trim().toLowerCase();
    if (!q) return base;
    return base.filter((k) => k.toLowerCase().includes(q));
  }, [onlySad, filter]);

  const rows = useMemo(() => {
    return keys.map((k) => {
      const v = localStorage.getItem(k) ?? "";
      // Try to extract updatedAt if present
      const maybe = safeJsonParse<any>(v, null);
      const updatedAt = maybe?.updatedAt ? String(maybe.updatedAt) : "";
      return { key: k, value: v, size: bytesApprox(v), updatedAt };
    });
  }, [keys]);

  const selectedKeys = useMemo(
    () => Object.entries(selected).filter(([, v]) => !!v).map(([k]) => k),
    [selected]
  );

  function selectAll(on: boolean) {
    const next: Record<string, boolean> = {};
    keys.forEach((k) => (next[k] = on));
    setSelected(next);
  }

  function toggleOne(k: string, on: boolean) {
    setSelected((prev) => ({ ...prev, [k]: on }));
  }

  function exportKeys(list: string[]) {
    const items: Record<string, string> = {};
    list.forEach((k) => {
      const v = localStorage.getItem(k);
      if (typeof v === "string") items[k] = v;
    });

    const bundle: Bundle = {
      version: 1,
      exportedAt: nowIso(),
      app: "state-alliance-dashboard",
      items,
    };

    const raw = JSON.stringify(bundle, null, 2);
    const filename = `sad-data-vault-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
    downloadText(filename, raw);
  }

  function exportAllVisible() {
    exportKeys(keys);
  }

  function exportSelected() {
    if (selectedKeys.length === 0) return alert("Select at least one key first.");
    exportKeys(selectedKeys);
  }

  function clearKeys(list: string[]) {
    if (list.length === 0) return alert("No keys selected.");
    const ok = confirm(`Delete ${list.length} localStorage entries? This cannot be undone (unless you exported first).`);
    if (!ok) return;
    list.forEach((k) => localStorage.removeItem(k));
    // refresh selection (remove cleared)
    setSelected((prev) => {
      const next = { ...prev };
      list.forEach((k) => delete next[k]);
      return next;
    });
    alert("Deleted.");
  }

  function importBundle(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      try {
        const obj = JSON.parse(text);

        // Accept either a Bundle or a raw {items:{...}}
        const bundle: Bundle =
          obj?.version === 1 && obj?.app === "state-alliance-dashboard" && obj?.items
            ? (obj as Bundle)
            : ({ version: 1, exportedAt: nowIso(), app: "state-alliance-dashboard", items: obj?.items ?? obj } as Bundle);

        if (!bundle.items || typeof bundle.items !== "object") throw new Error("No items found in import.");

        const keysToWrite = Object.keys(bundle.items);
        const ok = confirm(`Import will overwrite ${keysToWrite.length} keys. Continue?`);
        if (!ok) return;

        keysToWrite.forEach((k) => {
          const v = bundle.items[k];
          if (typeof v === "string") localStorage.setItem(k, v);
        });

        alert("Import complete. Reload pages to see updates.");
      } catch (e: any) {
        alert("Import failed: " + String(e?.message ?? e));
      }
    };
    reader.readAsText(file);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>Owner Data Vault</h1>
      <p style={{ opacity: 0.8, marginTop: 6 }}>
        Export/import localStorage configs. Default view shows <code>sad_*</code> keys only.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={onlySad} onChange={(e) => setOnlySad(e.target.checked)} />
          Only sad_* keys
        </label>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ opacity: 0.8 }}>Filter</span>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="key contains…" />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => selectAll(true)}>Select all</button>
          <button onClick={() => selectAll(false)}>Clear selection</button>
          <button onClick={exportAllVisible}>Export all visible</button>
          <button onClick={exportSelected}>Export selected</button>
          <button onClick={() => clearKeys(selectedKeys)}>Delete selected</button>

          <label>
            <input
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importBundle(f);
                e.currentTarget.value = "";
              }}
            />
            <span style={{ cursor: "pointer", padding: "6px 10px", border: "1px solid #666", borderRadius: 6 }}>
              Import JSON
            </span>
          </label>
        </div>

        <div style={{ opacity: 0.75 }}>
          Visible: <b>{rows.length}</b> • Selected: <b>{selectedKeys.length}</b>
        </div>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #444" }}>Sel</th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #444" }}>Key</th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #444" }}>Approx size</th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #444" }}>updatedAt</th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #444" }}>Preview</th>
              <th style={{ padding: 8, borderBottom: "1px solid #444" }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td style={{ padding: 8, borderBottom: "1px solid #333" }}>
                  <input
                    type="checkbox"
                    checked={!!selected[r.key]}
                    onChange={(e) => toggleOne(r.key, e.target.checked)}
                  />
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #333" }}>
                  <div style={{ fontWeight: 800 }}>{r.key}</div>
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #333" }}>{r.size}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #333", opacity: 0.85 }}>{r.updatedAt || ""}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #333", opacity: 0.85 }}>
                  <code style={{ fontSize: 12 }}>{preview(r.value)}</code>
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #333" }}>
                  <button onClick={() => copyToClipboard(r.value)}>Copy</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 12, opacity: 0.7 }}>
                  No keys found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 12, opacity: 0.7, fontSize: 12 }}>
        Tip: Export all visible before clearing. Import overwrites keys in the file.
      </p>
    </div>
  );
}
