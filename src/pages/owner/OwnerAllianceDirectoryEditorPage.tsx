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

function normStr(v: any) {
  return String(v ?? "").trim();
}

function countBy<T extends string>(arr: T[]) {
  const m = new Map<string, number>();
  arr.forEach((x) => m.set(x, (m.get(x) ?? 0) + 1));
  return m;
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

  const validation = useMemo(() => {
    const ids = workingItems.map((x) => normStr(x.alliance_id));
    const tags = workingItems.map((x) => normStr(x.tag)).filter(Boolean);

    const idCounts = countBy(ids.filter(Boolean));
    const tagCounts = countBy(tags);

    const dupIds = Array.from(idCounts.entries()).filter(([, c]) => c > 1).map(([k]) => k);
    const dupTags = Array.from(tagCounts.entries()).filter(([, c]) => c > 1).map(([k]) => k);

    const missing = workingItems
      .map((x, idx) => ({
        idx,
        alliance_id: normStr(x.alliance_id),
        tag: normStr(x.tag),
        name: normStr(x.name),
        state: normStr(x.state),
      }))
      .filter((r) => !r.alliance_id || !r.tag || !r.name);

    const byState = new Map<string, number>();
    workingItems.forEach((x) => {
      const st = normStr(x.state) || "(none)";
      byState.set(st, (byState.get(st) ?? 0) + 1);
    });

    return { dupIds, dupTags, missing, byState };
  }, [workingItems]);

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

  function normalizeRows() {
    setWorkingItems((prev) =>
      prev.map((x) => ({
        ...x,
        alliance_id: normStr(x.alliance_id),
        tag: normStr(x.tag),
        name: normStr(x.name),
        state: normStr(x.state) || "789",
        notes: normStr(x.notes),
      }))
    );
    setStatus("Normalized (trimmed) rows ✅");
    setTimeout(() => setStatus(""), 1500);
  }

  function sortBy(field: "tag" | "name" | "alliance_id" | "state") {
    setWorkingItems((prev) =>
      [...prev].sort((a, b) => normStr(a[field]).localeCompare(normStr(b[field])))
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Alliance Directory Editor (UI-only)</h1>
      <p style={{ opacity: 0.8, marginTop: 6 }}>
        Stored in localStorage key: <code>{LS_KEY}</code>. Export/import included. Improvements: validate + normalize + sort.
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

      <h2 style={{ fontSize: 18, fontWeight: 700 }}>Health / Preview</h2>
      <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
        <div style={{ padding: 12, border: "1px solid #333", borderRadius: 10 }}>
          <div style={{ fontWeight: 800 }}>Detected structure: <code>{mode}</code></div>
          <div style={{ opacity: 0.8, marginTop: 6 }}>Rows: <b>{workingItems.length}</b></div>
          <div style={{ opacity: 0.8, marginTop: 6 }}>
            By state:{" "}
            {Array.from(validation.byState.entries())
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([k, v]) => `${k}:${v}`)
              .join("  |  ") || "(none)"}
          </div>
        </div>

        <div style={{ padding: 12, border: "1px solid #333", borderRadius: 10 }}>
          <div style={{ fontWeight: 800 }}>Validation</div>
          <div style={{ marginTop: 8, opacity: 0.85 }}>
            Duplicate alliance_id: {validation.dupIds.length ? validation.dupIds.join(", ") : "(none)"}
          </div>
          <div style={{ marginTop: 6, opacity: 0.85 }}>
            Duplicate tag: {validation.dupTags.length ? validation.dupTags.join(", ") : "(none)"}
          </div>
          <div style={{ marginTop: 6, opacity: 0.85 }}>
            Missing required fields (alliance_id/tag/name): {validation.missing.length ? validation.missing.length : 0}
          </div>
          {validation.missing.length ? (
            <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>
              {validation.missing.slice(0, 10).map((m) => (
                <div key={m.idx}>
                  Row {m.idx + 1}: id="{m.alliance_id}" tag="{m.tag}" name="{m.name}"
                </div>
              ))}
              {validation.missing.length > 10 ? <div>…and more</div> : null}
            </div>
          ) : null}
        </div>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      <h2 style={{ fontSize: 18, fontWeight: 700 }}>Table View (best-effort)</h2>
      <p style={{ opacity: 0.8, marginTop: 6 }}>
        If detection is <code>unknown</code>, use Raw JSON below. Otherwise you can edit rows here and save.
      </p>

      {mode === "unknown" ? (
        <div style={{ padding: 12, border: "1px dashed #666", borderRadius: 8, marginTop: 10 }}>
          I couldn’t auto-detect a list structure. Use the Raw JSON editor below, or convert to an array /
          <code>{`{ alliances: [...] }`}</code>.
        </div>
      ) : (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() =>
                setWorkingItems((prev) => [
                  ...prev,
                  { alliance_id: "", tag: "", name: "", state: "789", notes: "" },
                ])
              }
            >
              + Add Alliance
            </button>

            <button onClick={normalizeRows}>Normalize (trim)</button>

            <button onClick={() => sortBy("tag")}>Sort by tag</button>
            <button onClick={() => sortBy("name")}>Sort by name</button>
            <button onClick={() => sortBy("alliance_id")}>Sort by id</button>
            <button onClick={() => sortBy("state")}>Sort by state</button>

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
                      No items found. Add one, or use Raw JSON.
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
