import React, { useEffect, useMemo, useState } from "react";

const LS_KEY = "sad_alliance_directory_v1";

type DirectoryItem = Record<string, any>;

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function emitStorageUpdate(key: string, newValue: string) {
  // Try to notify listeners in the SAME tab too.
  try {
    // eslint-disable-next-line no-new
    const ev = new StorageEvent("storage", { key, newValue });
    window.dispatchEvent(ev);
  } catch {
    window.dispatchEvent(new CustomEvent("sad:localstorage", { detail: { key, newValue } }));
  }
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

function tryExtractList(value: any): { mode: string; items: DirectoryItem[] } {
  if (Array.isArray(value)) return { mode: "array", items: value };
  if (value && typeof value === "object") {
    if (Array.isArray((value as any).alliances)) return { mode: "obj.alliances", items: (value as any).alliances };
    if (value.states && typeof value.states === "object") {
      const stateKeys = Object.keys(value.states);
      for (const k of stateKeys) {
        const st = value.states[k];
        if (st && Array.isArray(st.alliances)) return { mode: `states.${k}.alliances`, items: st.alliances };
        if (Array.isArray(st)) return { mode: `states.${k} (array)`, items: st };
      }
    }
  }
  return { mode: "unknown", items: [] };
}

function applyListBack(original: any, mode: string, items: DirectoryItem[]): any {
  if (mode === "array") return items;
  if (mode === "obj.alliances" && original && typeof original === "object") {
    return { ...original, alliances: items };
  }
  if (mode.startsWith("states.") && original && typeof original === "object") {
    const parts = mode.split(".");
    const stateKey = parts[1];
    const isAlliances = mode.endsWith(".alliances");
    const nextStates = { ...(original.states ?? {}) };
    const prevState = nextStates[stateKey] ?? {};
    nextStates[stateKey] = isAlliances ? { ...(prevState || {}), alliances: items } : items;
    return { ...original, states: nextStates };
  }
  return original;
}

export default function OwnerAllianceDirectoryEditorPage() {
  const [raw, setRaw] = useState<string>(() => localStorage.getItem(LS_KEY) ?? "");
  const [status, setStatus] = useState<string>("");

  const parsed = useMemo(() => safeJsonParse<any>(raw || null, null), [raw]);
  const { mode, items } = useMemo(() => tryExtractList(parsed), [parsed]);

  const [workingItems, setWorkingItems] = useState<DirectoryItem[]>(items);

  useEffect(() => {
    setWorkingItems(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, raw]);

  function saveRaw(nextRaw: string) {
    localStorage.setItem(LS_KEY, nextRaw);
    emitStorageUpdate(LS_KEY, nextRaw);
    setStatus("Saved ✅");
    setTimeout(() => setStatus(""), 1500);
  }

  function onSaveTable() {
    const original = safeJsonParse<any>(raw || null, null);
    if (!original) {
      setStatus("Cannot apply table edits because JSON is invalid. Fix Raw JSON first.");
      return;
    }
    const nextObj = applyListBack(original, mode, workingItems);
    const nextRaw = JSON.stringify(nextObj, null, 2);
    setRaw(nextRaw);
    saveRaw(nextRaw);
  }

  function onSaveRaw() {
    try {
      const obj = JSON.parse(raw);
      const nextRaw = JSON.stringify(obj, null, 2);
      setRaw(nextRaw);
      saveRaw(nextRaw);
    } catch (e: any) {
      setStatus(`Invalid JSON: ${String(e?.message ?? e)}`);
    }
  }

  function onExport() {
    const filename = `alliance-directory-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
    downloadText(filename, raw || "{}");
  }

  function onImport(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setRaw(text);
      try {
        const obj = JSON.parse(text);
        const pretty = JSON.stringify(obj, null, 2);
        setRaw(pretty);
        saveRaw(pretty);
      } catch (e: any) {
        setStatus(`Import failed (invalid JSON): ${String(e?.message ?? e)}`);
      }
    };
    reader.readAsText(file);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Alliance Directory Editor (UI-only)</h1>
      <p style={{ opacity: 0.8, marginTop: 6 }}>
        Stored in localStorage key: <code>{LS_KEY}</code>. This page won’t rename the key. Export/import included.
      </p>

      {status ? (
        <div style={{ marginTop: 10, padding: 10, border: "1px solid #444", borderRadius: 8 }}>
          {status}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <button onClick={onSaveRaw}>Save Raw JSON</button>
        <button onClick={onExport}>Export JSON</button>
        <label style={{ display: "inline-block" }}>
          <input
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.currentTarget.value = "";
            }}
          />
          <span style={{ cursor: "pointer", padding: "6px 10px", border: "1px solid #666", borderRadius: 6 }}>
            Import JSON
          </span>
        </label>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      <h2 style={{ fontSize: 18, fontWeight: 700 }}>Table View (best-effort)</h2>
      <p style={{ opacity: 0.8, marginTop: 6 }}>
        Detected structure: <code>{mode}</code>. If detection is <code>unknown</code>, use Raw JSON below.
      </p>

      {mode === "unknown" ? (
        <div style={{ padding: 12, border: "1px dashed #666", borderRadius: 8, marginTop: 10 }}>
          I couldn’t auto-detect a list structure. Use the Raw JSON editor below (safe), or adapt the directory to an
          array / <code>{`{ alliances: [...] }`}</code> shape.
        </div>
      ) : (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() =>
                setWorkingItems((prev) => [
                  ...prev,
                  {
                    alliance_id: "",
                    tag: "",
                    name: "",
                    state: "789",
                  },
                ])
              }
            >
              + Add Alliance
            </button>
            <button onClick={onSaveTable}>Save Table to Directory</button>
          </div>

          <div style={{ overflowX: "auto", marginTop: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["alliance_id", "tag", "name", "state", "notes"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #444" }}>
                      {h}
                    </th>
                  ))}
                  <th style={{ padding: 8, borderBottom: "1px solid #444" }} />
                </tr>
              </thead>
              <tbody>
                {workingItems.map((row, idx) => (
                  <tr key={idx}>
                    {["alliance_id", "tag", "name", "state", "notes"].map((k) => (
                      <td key={k} style={{ padding: 8, borderBottom: "1px solid #333" }}>
                        <input
                          value={String((row as any)[k] ?? "")}
                          onChange={(e) => {
                            const v = e.target.value;
                            setWorkingItems((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], [k]: v };
                              return next;
                            });
                          }}
                          style={{ width: "100%" }}
                          placeholder={k}
                        />
                      </td>
                    ))}
                    <td style={{ padding: 8, borderBottom: "1px solid #333" }}>
                      <button onClick={() => setWorkingItems((prev) => prev.filter((_, i) => i !== idx))} title="Remove">
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
                {workingItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 10, opacity: 0.7 }}>
                      No items found in detected list. Add one, or use Raw JSON.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <hr style={{ margin: "18px 0", opacity: 0.3 }} />

      <h2 style={{ fontSize: 18, fontWeight: 700 }}>Raw JSON (authoritative)</h2>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={18}
        style={{ width: "100%", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}
        placeholder={`Paste JSON here. This editor preserves your existing structure for ${LS_KEY}.`}
      />
    </div>
  );
}
