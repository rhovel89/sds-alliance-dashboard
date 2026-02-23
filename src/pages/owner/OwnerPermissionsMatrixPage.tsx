import React, { useMemo, useState } from "react";

const LS_MATRIX = "sad_permissions_matrix_v1";
const LS_DIRECTORY = "sad_alliance_directory_v1";

type Preset = {
  id: string;
  label: string;
  perms: Record<string, boolean>;
};

type Matrix = {
  version: 1;
  updatedAt: string;
  presets?: Preset[];
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

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
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
  presets: [
    {
      id: "preset_member",
      label: "Member (basic)",
      perms: {
        tab_my_alliance: true,
        tab_state_alliance: true,
        tab_my_mail: true,
        tab_event_calendar: true,
        tab_alliance_directory: true,
        tab_events: false,
        tab_permissions: false,
        tab_hq_layout: false,
      },
    },
    {
      id: "preset_leadership",
      label: "Leadership (full)",
      perms: {
        tab_my_alliance: true,
        tab_state_alliance: true,
        tab_my_mail: true,
        tab_event_calendar: true,
        tab_alliance_directory: true,
        tab_events: true,
        tab_permissions: true,
        tab_hq_layout: true,
      },
    },
  ],
  alliances: {},
});

export default function OwnerPermissionsMatrixPage() {
  const [matrix, setMatrix] = useState<Matrix>(() => safeJsonParse<Matrix>(localStorage.getItem(LS_MATRIX), emptyMatrix()));
  const [selectedAlliance, setSelectedAlliance] = useState<string>("");

  const [search, setSearch] = useState<string>("");
  const [selectedPeople, setSelectedPeople] = useState<Record<string, boolean>>({});
  const [bulkPerm, setBulkPerm] = useState<string>(PERM_KEYS[0]);
  const [bulkMode, setBulkMode] = useState<"enable" | "disable" | "toggle">("toggle");

  const [copyFrom, setCopyFrom] = useState<string>("");
  const [presetPick, setPresetPick] = useState<string>("");

  const dirRaw = localStorage.getItem(LS_DIRECTORY);
  const dirObj = useMemo(() => safeJsonParse<any>(dirRaw, null), [dirRaw]);
  const allianceChoices = useMemo(() => extractAllianceChoices(dirObj), [dirObj]);

  const allianceBlock = selectedAlliance ? matrix.alliances[selectedAlliance] : undefined;
  const peopleEntries = useMemo(() => Object.entries(allianceBlock?.people ?? {}), [allianceBlock]);

  const filteredPeople = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return peopleEntries;
    return peopleEntries.filter(([k, p]) => {
      const hay = `${k} ${p.displayName}`.toLowerCase();
      return hay.includes(q);
    });
  }, [peopleEntries, search]);

  const presets = matrix.presets ?? [];

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

  function toggleOne(allianceId: string, personKey: string, permKey: string) {
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
    setSelectedPeople((prev) => {
      const n = { ...prev };
      delete n[personKey];
      return n;
    });
  }

  function selectAllVisible(on: boolean) {
    const keys = filteredPeople.map(([k]) => k);
    setSelectedPeople((prev) => {
      const next = { ...prev };
      keys.forEach((k) => (next[k] = on));
      return next;
    });
  }

  function getSelectedKeys(): string[] {
    return Object.entries(selectedPeople)
      .filter(([, v]) => !!v)
      .map(([k]) => k);
  }

  function bulkApplyPerm() {
    if (!selectedAlliance) return;
    const keys = getSelectedKeys();
    if (keys.length === 0) return alert("Select at least one person (checkboxes) first.");

    const nextPeople = { ...(matrix.alliances[selectedAlliance]?.people ?? {}) };
    keys.forEach((personKey) => {
      const cur = nextPeople[personKey];
      if (!cur) return;
      const curVal = !!cur.perms[bulkPerm];
      const nextVal = bulkMode === "toggle" ? !curVal : bulkMode === "enable";
      nextPeople[personKey] = { ...cur, perms: { ...cur.perms, [bulkPerm]: nextVal } };
    });

    persist({
      ...matrix,
      alliances: {
        ...matrix.alliances,
        [selectedAlliance]: { ...(matrix.alliances[selectedAlliance] ?? { people: {} }), people: nextPeople },
      },
    });
  }

  function copyPermsFromSource() {
    if (!selectedAlliance) return;
    const keys = getSelectedKeys();
    if (!copyFrom) return alert("Pick a 'Copy from' person.");
    if (keys.length === 0) return alert("Select target people first.");
    if (keys.includes(copyFrom) && keys.length === 1) return alert("Select at least one target different from source.");

    const src = matrix.alliances[selectedAlliance]?.people?.[copyFrom];
    if (!src) return alert("Source person not found.");

    const nextPeople = { ...(matrix.alliances[selectedAlliance]?.people ?? {}) };
    keys.forEach((k) => {
      if (k === copyFrom) return;
      const cur = nextPeople[k];
      if (!cur) return;
      nextPeople[k] = { ...cur, perms: { ...src.perms } };
    });

    persist({
      ...matrix,
      alliances: {
        ...matrix.alliances,
        [selectedAlliance]: { ...(matrix.alliances[selectedAlliance] ?? { people: {} }), people: nextPeople },
      },
    });
  }

  function applyPresetToSelected() {
    if (!selectedAlliance) return;
    const keys = getSelectedKeys();
    if (!presetPick) return alert("Pick a preset first.");
    if (keys.length === 0) return alert("Select target people first.");

    const preset = presets.find((p) => p.id === presetPick);
    if (!preset) return alert("Preset not found.");

    const nextPeople = { ...(matrix.alliances[selectedAlliance]?.people ?? {}) };
    keys.forEach((k) => {
      const cur = nextPeople[k];
      if (!cur) return;
      nextPeople[k] = { ...cur, perms: { ...cur.perms, ...preset.perms } };
    });

    persist({
      ...matrix,
      alliances: {
        ...matrix.alliances,
        [selectedAlliance]: { ...(matrix.alliances[selectedAlliance] ?? { people: {} }), people: nextPeople },
      },
    });
  }

  function createPresetFromPerson() {
    if (!selectedAlliance) return;
    const keys = getSelectedKeys();
    if (keys.length !== 1) return alert("Select exactly ONE person to create a preset from.");
    const personKey = keys[0];
    const person = matrix.alliances[selectedAlliance]?.people?.[personKey];
    if (!person) return alert("Person not found.");

    const label = prompt("Preset label:", `Preset from ${person.displayName}`)?.trim();
    if (!label) return;

    const newPreset: Preset = { id: uid("preset"), label, perms: { ...person.perms } };
    persist({ ...matrix, presets: [...presets, newPreset] });
    setPresetPick(newPreset.id);
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

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Alliance</div>
          <select
            value={selectedAlliance}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedAlliance(id);
              setSelectedPeople({});
              setSearch("");
              setCopyFrom("");
              setPresetPick("");
              if (id) {
                const label = allianceChoices.find((x) => x.id === id)?.label;
                ensureAlliance(id, label);
              }
            }}
            style={{ minWidth: 320 }}
          >
            <option value="">Select an alliance…</option>
            {allianceChoices.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label} ({a.id})
              </option>
            ))}
          </select>

          <div style={{ opacity: 0.7, marginTop: 8 }}>
            If directory isn’t populated yet, type an alliance id and press Enter:
          </div>
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
            style={{ minWidth: 320, marginTop: 6 }}
          />
        </div>

        {selectedAlliance ? (
          <div style={{ marginTop: 22 }}>
            <button onClick={() => addPerson(selectedAlliance)}>+ Add Person</button>
          </div>
        ) : null}

        {selectedAlliance ? (
          <div style={{ marginTop: 22 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Search</div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="name or key…" />
          </div>
        ) : null}
      </div>

      {selectedAlliance && allianceBlock ? (
        <>
          <hr style={{ margin: "16px 0", opacity: 0.3 }} />

          <div style={{ border: "1px solid #333", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 800 }}>Bulk Tools (selected people)</div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
              <button onClick={() => selectAllVisible(true)}>Select all visible</button>
              <button onClick={() => selectAllVisible(false)}>Clear visible</button>
              <div style={{ opacity: 0.75 }}>
                Selected: <b>{getSelectedKeys().length}</b>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Bulk permission</div>
                <select value={bulkPerm} onChange={(e) => setBulkPerm(e.target.value)} style={{ minWidth: 260 }}>
                  {PERM_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Mode</div>
                <select value={bulkMode} onChange={(e) => setBulkMode(e.target.value as any)} style={{ minWidth: 140 }}>
                  <option value="toggle">toggle</option>
                  <option value="enable">enable</option>
                  <option value="disable">disable</option>
                </select>
              </div>

              <div style={{ marginTop: 22 }}>
                <button onClick={bulkApplyPerm}>Apply bulk</button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Copy from</div>
                <select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} style={{ minWidth: 260 }}>
                  <option value="">(choose source)</option>
                  {peopleEntries.map(([k, p]) => (
                    <option key={k} value={k}>
                      {p.displayName} ({k})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 22 }}>
                <button onClick={copyPermsFromSource}>Copy perms → selected</button>
              </div>

              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Preset</div>
                <select value={presetPick} onChange={(e) => setPresetPick(e.target.value)} style={{ minWidth: 260 }}>
                  <option value="">(choose preset)</option>
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 22, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={applyPresetToSelected}>Apply preset → selected</button>
                <button onClick={createPresetFromPerson}>Create preset from ONE selected</button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #444" }}>Sel</th>
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
                {filteredPeople.map(([personKey, p]) => (
                  <tr key={personKey}>
                    <td style={{ padding: 8, borderBottom: "1px solid #333" }}>
                      <input
                        type="checkbox"
                        checked={!!selectedPeople[personKey]}
                        onChange={(e) => setSelectedPeople((prev) => ({ ...prev, [personKey]: e.target.checked }))}
                      />
                    </td>

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
                            onChange={() => toggleOne(selectedAlliance, personKey, permKey)}
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

                {filteredPeople.length === 0 ? (
                  <tr>
                    <td colSpan={PERM_KEYS.length + 3} style={{ padding: 10, opacity: 0.7 }}>
                      No people match your search.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div style={{ marginTop: 16, padding: 12, border: "1px dashed #666", borderRadius: 8 }}>
          Select an alliance to edit permissions.
        </div>
      )}
    </div>
  );
}
