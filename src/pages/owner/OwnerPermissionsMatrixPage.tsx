import React, { useMemo, useState } from "react";

const LS_MATRIX = "sad_permissions_matrix_v1";
const LS_DIRECTORY = "sad_alliance_directory_v1";

type Matrix = {
  version: 1;
  updatedAt: string;
  alliances: Record<
    string,
    {
      label?: string;
      people: Record<
        string,
        {
          displayName: string;
          perms: Record<string, boolean>;
        }
      >;
    }
  >;
};

const PERM_KEYS = [
  "tab_my_alliance",
  "tab_state_alliance",
  "tab_my_mail",
  "tab_event_calendar",
  "tab_alliance_directory",
  "tab_events",
  "tab_permissions",
  "tab_hq_layout",
] as const;

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, obj: any) {
  const raw = JSON.stringify(obj, null, 2);
  localStorage.setItem(key, raw);
  try {
    // eslint-disable-next-line no-new
    const ev = new StorageEvent("storage", { key, newValue: raw });
    window.dispatchEvent(ev);
  } catch {
    window.dispatchEvent(new CustomEvent("sad:localstorage", { detail: { key, newValue: raw } }));
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

function extractAllianceChoices(dir: any): Array<{ id: string; label: string }> {
  if (Array.isArray(dir)) {
    return dir
      .map((x: any) => ({
        id: String(x.alliance_id ?? x.id ?? x.code ?? x.tag ?? ""),
        label: String(x.name ?? x.tag ?? x.code ?? x.alliance_id ?? "Alliance"),
      }))
      .filter((x) => x.id);
  }
  if (dir && typeof dir === "object") {
    const list = Array.isArray(dir.alliances) ? dir.alliances : null;
    if (list) {
      return list
        .map((x: any) => ({
          id: String(x.alliance_id ?? x.id ?? x.code ?? x.tag ?? ""),
          label: String(x.name ?? x.tag ?? x.code ?? x.alliance_id ?? "Alliance"),
        }))
        .filter((x) => x.id);
    }
  }
  return [];
}

const emptyMatrix = (): Matrix => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  alliances: {},
});

export default function OwnerPermissionsMatrixPage() {
  const [matrix, setMatrix] = useState<Matrix>(() => safeJsonParse<Matrix>(localStorage.getItem(LS_MATRIX), emptyMatrix()));
  const [selectedAlliance, setSelectedAlliance] = useState<string>("");

  const dirRaw = localStorage.getItem(LS_DIRECTORY);
  const dirObj = useMemo(() => safeJsonParse<any>(dirRaw, null), [dirRaw]);
  const allianceChoices = useMemo(() => extractAllianceChoices(dirObj), [dirObj]);

  const allianceBlock = matrix.alliances[selectedAlliance];

  function persist(next: Matrix) {
    const withTs: Matrix = { ...next, updatedAt: new Date().toISOString() };
    setMatrix(withTs);
    saveJson(LS_MATRIX, withTs);
  }

  function ensureAlliance(id: string, label?: string) {
    if (!id) return;
    if (matrix.alliances[id]) return;
    persist({
      ...matrix,
      alliances: {
        ...matrix.alliances,
        [id]: { label: label ?? id, people: {} },
      },
    });
  }

  function addPerson(allianceId: string) {
    const userKey = prompt("Enter a unique person key (Supabase user_id later, for now any unique string):")?.trim();
    if (!userKey) return;

    const displayName = prompt("Display name (in-game / Discord):")?.trim() || userKey;

    const existing = matrix.alliances[allianceId]?.people?.[userKey];
    if (existing) return alert("That person key already exists for this alliance.");

    const perms: Record<string, boolean> = {};
    for (const k of PERM_KEYS) perms[k] = false;

    const next = {
      ...matrix,
      alliances: {
        ...matrix.alliances,
        [allianceId]: {
          ...(matrix.alliances[allianceId] ?? { people: {} }),
          people: {
            ...(matrix.alliances[allianceId]?.people ?? {}),
            [userKey]: { displayName, perms },
          },
        },
      },
    };

    persist(next as Matrix);
  }

  function toggle(allianceId: string, personKey: string, permKey: string) {
    const cur = matrix.alliances[allianceId]?.people?.[personKey];
    if (!cur) return;

    const nextVal = !cur.perms[permKey];
    const next = {
      ...matrix,
      alliances: {
        ...matrix.alliances,
        [allianceId]: {
          ...(matrix.alliances[allianceId] ?? { people: {} }),
          people: {
            ...(matrix.alliances[allianceId]?.people ?? {}),
            [personKey]: {
              ...cur,
              perms: { ...cur.perms, [permKey]: nextVal },
            },
          },
        },
      },
    };

    persist(next as Matrix);
  }

  function removePerson(allianceId: string, personKey: string) {
    const people = { ...(matrix.alliances[allianceId]?.people ?? {}) };
    delete people[personKey];
    persist({
      ...matrix,
      alliances: {
        ...matrix.alliances,
        [allianceId]: { ...(matrix.alliances[allianceId] ?? { people: {} }), people },
      },
    });
  }

  function exportMatrix() {
    const raw = JSON.stringify(matrix, null, 2);
    downloadText(`permissions-matrix-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`, raw);
  }

  function importMatrix(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      try {
        const obj = JSON.parse(text);
        if (!obj || obj.version !== 1) throw new Error("Unexpected format (expected version: 1).");
        persist(obj as Matrix);
      } catch (e: any) {
        alert(`Import failed: ${String(e?.message ?? e)}`);
      }
    };
    reader.readAsText(file);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Permissions Matrix (UI shell)</h1>
      <p style={{ opacity: 0.8, marginTop: 6 }}>
        Stored in <code>{LS_MATRIX}</code>. Not enforced by backend yet — this is for workflow + export/import.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <button onClick={exportMatrix}>Export</button>
        <label>
          <input
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importMatrix(f);
              e.currentTarget.value = "";
            }}
          />
          <span style={{ cursor: "pointer", padding: "6px 10px", border: "1px solid #666", borderRadius: 6 }}>
            Import
          </span>
        </label>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Alliance</div>
          <select
            value={selectedAlliance}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedAlliance(id);
              if (id) {
                const label = allianceChoices.find((x) => x.id === id)?.label;
                ensureAlliance(id, label);
              }
            }}
            style={{ minWidth: 300 }}
          >
            <option value="">Select an alliance…</option>
            {allianceChoices.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label} ({a.id})
              </option>
            ))}
          </select>
          <div style={{ opacity: 0.7, marginTop: 6 }}>
            If directory isn’t populated yet, you can still type an alliance id:
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <input
              placeholder="Alliance id…"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const id = (e.currentTarget.value || "").trim();
                  if (!id) return;
                  ensureAlliance(id, id);
                  setSelectedAlliance(id);
                  e.currentTarget.value = "";
                }
              }}
              style={{ minWidth: 300 }}
            />
          </div>
        </div>

        {selectedAlliance ? (
          <div style={{ marginTop: 24 }}>
            <button onClick={() => addPerson(selectedAlliance)}>+ Add Person</button>
          </div>
        ) : null}
      </div>

      {selectedAlliance && allianceBlock ? (
        <div style={{ marginTop: 16, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #444" }}>Person</th>
                {PERM_KEYS.map((k) => (
                  <th key={k} style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #444" }}>
                    {k}
                  </th>
                ))}
                <th style={{ padding: 8, borderBottom: "1px solid #444" }} />
              </tr>
            </thead>
            <tbody>
              {Object.entries(allianceBlock.people ?? {}).map(([personKey, p]) => (
                <tr key={personKey}>
                  <td style={{ padding: 8, borderBottom: "1px solid #333" }}>
                    <div style={{ fontWeight: 700 }}>{p.displayName}</div>
                    <div style={{ opacity: 0.7, fontSize: 12 }}>{personKey}</div>
                  </td>
                  {PERM_KEYS.map((permKey) => (
                    <td key={permKey} style={{ padding: 8, borderBottom: "1px solid #333" }}>
                      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={!!p.perms?.[permKey]}
                          onChange={() => toggle(selectedAlliance, personKey, permKey)}
                        />
                        <span>{p.perms?.[permKey] ? "On" : "Off"}</span>
                      </label>
                    </td>
                  ))}
                  <td style={{ padding: 8, borderBottom: "1px solid #333" }}>
                    <button onClick={() => removePerson(selectedAlliance, personKey)}>Remove</button>
                  </td>
                </tr>
              ))}
              {Object.keys(allianceBlock.people ?? {}).length === 0 ? (
                <tr>
                  <td colSpan={PERM_KEYS.length + 2} style={{ padding: 10, opacity: 0.7 }}>
                    No people added yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ marginTop: 16, padding: 12, border: "1px dashed #666", borderRadius: 8 }}>
          Select an alliance to edit permissions.
        </div>
      )}
    </div>
  );
}
