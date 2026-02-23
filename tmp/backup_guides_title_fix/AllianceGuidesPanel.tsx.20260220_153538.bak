import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useHQPermissions } from "../../hooks/useHQPermissions";

type Mode = "readonly" | "discussion";

type SectionRow = {
  id: string;
  alliance_code: string;
  title: string;
  description?: string | null;
  mode?: Mode | string | null;      // newer schema
  readonly?: boolean | null;        // older schema
  updated_at?: string | null;
};

type EntryRow = {
  id: string;
  alliance_code: string;
  section_id: string;
  title: string;
  body: string;
  updated_at?: string | null;
  created_at?: string | null;
};

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function allianceFromParams(p: Record<string, string | undefined>) {
  const raw =
    (p as any).alliance_id ??
    (p as any).alliance_code ??
    (p as any).code ??
    (p as any).alliance ??
    "";
  return upper(raw);
}

function rowMode(s: SectionRow): Mode {
  const m = String(s.mode ?? "").trim().toLowerCase();
  if (m === "readonly" || m === "discussion") return m as Mode;
  return s.readonly ? "readonly" : "discussion";
}

export default function AllianceGuidesPanel() {
  const params = useParams();
  const allianceCode = useMemo(() => allianceFromParams(params as any), [params]);

  const { canEdit } = useHQPermissions(allianceCode);

  const [sections, setSections] = useState<SectionRow[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<Mode>("discussion");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => sections.find((s) => s.id === selectedId) ?? null,
    [sections, selectedId]
  );

  // Section editor
  const [editingSection, setEditingSection] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editMode, setEditMode] = useState<Mode>("discussion");
  const [editDesc, setEditDesc] = useState("");

  // Entries inside section
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [entriesErr, setEntriesErr] = useState<string | null>(null);

  const [entryTitle, setEntryTitle] = useState("");
  const [entryBody, setEntryBody] = useState("");

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editEntryTitle, setEditEntryTitle] = useState("");
  const [editEntryBody, setEditEntryBody] = useState("");

  const FG = "#f3f3f3";
  const MUTED = "rgba(243,243,243,0.72)";

  const refetchSections = async () => {
    if (!allianceCode) return;
    setLoadingSections(true);
    setErr(null);

    try {
      const res = await supabase
        .from("guide_sections")
        .select("id, alliance_code, title, description, mode, readonly, updated_at")
        .eq("alliance_code", allianceCode)
        .order("updated_at", { ascending: false })
        .limit(200);

      if (res.error) {
        // fallback minimal
        const res2 = await supabase
          .from("guide_sections")
          .select("id, alliance_code, title, description, updated_at")
          .eq("alliance_code", allianceCode)
          .order("updated_at", { ascending: false })
          .limit(200);

        if (res2.error) throw res2.error;
        setSections((res2.data ?? []) as any);
      } else {
        setSections((res.data ?? []) as any);
      }
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? String(e));
    } finally {
      setLoadingSections(false);
    }
  };

  const refetchEntries = async (section: SectionRow) => {
    setLoadingEntries(true);
    setEntriesErr(null);
    try {
      const res = await supabase
        .from("guide_section_entries")
        .select("id, alliance_code, section_id, title, body, created_at, updated_at")
        .eq("alliance_code", allianceCode)
        .eq("section_id", section.id)
        .order("updated_at", { ascending: false })
        .limit(200);

      if (res.error) throw res.error;
      setEntries((res.data ?? []) as any);
    } catch (e: any) {
      console.error(e);
      const msg = e?.message ?? String(e);
      // If migration not applied yet
      if (String(msg).toLowerCase().includes("does not exist")) {
        setEntriesErr("Entries table not found. Run supabase db push for guide_section_entries.");
      } else {
        setEntriesErr(msg);
      }
    } finally {
      setLoadingEntries(false);
    }
  };

  useEffect(() => {
    refetchSections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allianceCode]);

  // Auto select first section
  useEffect(() => {
    if (!selectedId && sections.length > 0) setSelectedId(sections[0].id);
  }, [sections, selectedId]);

  // When selection changes, load section + entries
  useEffect(() => {
    if (!selected) return;
    setEditingSection(false);
    setEditTitle(selected.title ?? "");
    setEditMode(rowMode(selected));
    setEditDesc(String(selected.description ?? ""));

    // load entries
    refetchEntries(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const createSection = async () => {
    const clean = title.trim();
    if (!clean) return;

    if (!allianceCode) return alert("Missing alliance code in URL (/dashboard/<CODE>/guides).");

    setErr(null);

    // Insert attempt A: mode + created_by
    const payloadA: any = {
      alliance_code: allianceCode,
      title: clean,
      description: null,
      mode,
    };

    let ins = await supabase.from("guide_sections").insert(payloadA).select("id").single();

    if (ins.error) {
      const msg = String(ins.error.message ?? "").toLowerCase();
      const missingMode = msg.includes("column") && msg.includes("mode");

      // Insert attempt B: readonly boolean (older schema)
      if (missingMode) {
        const payloadB: any = {
          alliance_code: allianceCode,
          title: clean,
          description: null,
          readonly: mode === "readonly",
        };

        const ins2 = await supabase.from("guide_sections").insert(payloadB).select("id").single();
        if (ins2.error) {
          console.error(ins2.error);
          setErr(ins2.error.message);
          alert(ins2.error.message);
          return;
        }
      } else {
        console.error(ins.error);
        setErr(ins.error.message);
        alert(ins.error.message);
        return;
      }
    }

    setTitle("");
    setMode("discussion");
    await refetchSections();
  };

  const saveSectionEdits = async () => {
    if (!selected) return;
    const t = editTitle.trim();
    if (!t) return alert("Title required.");

    setErr(null);

    // Try update with mode
    const payloadA: any = {
      title: t,
      description: editDesc,
      mode: editMode,
      updated_at: new Date().toISOString(),
    };

    const upd = await supabase.from("guide_sections").update(payloadA).eq("id", selected.id);

    if (upd.error) {
      const msg = String(upd.error.message ?? "").toLowerCase();
      const missingMode = msg.includes("column") && msg.includes("mode");

      if (missingMode) {
        const payloadB: any = {
          title: t,
          description: editDesc,
          readonly: editMode === "readonly",
          updated_at: new Date().toISOString(),
        };
        const upd2 = await supabase.from("guide_sections").update(payloadB).eq("id", selected.id);
        if (upd2.error) {
          console.error(upd2.error);
          setErr(upd2.error.message);
          alert(upd2.error.message);
          return;
        }
      } else {
        console.error(upd.error);
        setErr(upd.error.message);
        alert(upd.error.message);
        return;
      }
    }

    setEditingSection(false);
    await refetchSections();
  };

  const deleteSection = async () => {
    if (!selected) return;
    if (!confirm(`Delete section "${selected.title}"? This will also delete its entries.`)) return;

    setErr(null);

    const del = await supabase.from("guide_sections").delete().eq("id", selected.id);
    if (del.error) {
      console.error(del.error);
      setErr(del.error.message);
      alert(del.error.message);
      return;
    }

    setSelectedId(null);
    setEntries([]);
    await refetchSections();
  };

  const createEntry = async () => {
    if (!selected) return;
    const t = entryTitle.trim();
    const b = entryBody.trim();
    if (!t) return alert("Entry title required.");
    if (!b) return alert("Entry body required.");

    setEntriesErr(null);

    const ins = await supabase
      .from("guide_section_entries")
      .insert({
        alliance_code: allianceCode,
        section_id: selected.id,
        title: t,
        body: b,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (ins.error) {
      console.error(ins.error);
      setEntriesErr(ins.error.message);
      alert(ins.error.message);
      return;
    }

    setEntryTitle("");
    setEntryBody("");
    await refetchEntries(selected);
  };

  const startEditEntry = (e: EntryRow) => {
    setEditingEntryId(e.id);
    setEditEntryTitle(e.title ?? "");
    setEditEntryBody(e.body ?? "");
  };

  const saveEntry = async () => {
    if (!selected) return;
    if (!editingEntryId) return;

    const t = editEntryTitle.trim();
    const b = editEntryBody.trim();
    if (!t) return alert("Entry title required.");
    if (!b) return alert("Entry body required.");

    setEntriesErr(null);

    const upd = await supabase
      .from("guide_section_entries")
      .update({ title: t, body: b, updated_at: new Date().toISOString() })
      .eq("id", editingEntryId);

    if (upd.error) {
      console.error(upd.error);
      setEntriesErr(upd.error.message);
      alert(upd.error.message);
      return;
    }

    setEditingEntryId(null);
    await refetchEntries(selected);
  };

  const deleteEntry = async (id: string) => {
    if (!selected) return;
    if (!confirm("Delete this entry?")) return;

    setEntriesErr(null);

    const del = await supabase.from("guide_section_entries").delete().eq("id", id);
    if (del.error) {
      console.error(del.error);
      setEntriesErr(del.error.message);
      alert(del.error.message);
      return;
    }

    await refetchEntries(selected);
  };

  return (
    <div style={{ padding: 18, color: FG }}>
      <div style={{ opacity: 0.85, fontSize: 12 }}>
        Guides {allianceCode ? `/dashboard/${allianceCode}/guides` : "(missing alliance code)"}
      </div>

      {canEdit ? (
        <div style={{ marginTop: 12, border: "1px solid #222", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Create Section</div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Section title (ex: Hunt Mastery)"
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 10,
              border: "1px solid #333",
              background: "transparent",
              color: FG,
            }}
          />

          <div style={{ marginTop: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.85 }}>Mode</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as Mode)}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid #333",
                  background: "transparent",
                  color: FG,
                }}
              >
                <option value="discussion">Discussion</option>
                <option value="readonly">Read only</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={createSection}
            style={{
              marginTop: 10,
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #333",
              fontWeight: 900,
              cursor: "pointer",
              background: "transparent",
              color: FG,
            }}
          >
            Save Section
          </button>

          {err ? (
            <div style={{ marginTop: 10, color: "#ff8080", fontSize: 12, whiteSpace: "pre-wrap" }}>
              {err}
            </div>
          ) : null}
        </div>
      ) : (
        <div style={{ marginTop: 12, opacity: 0.75, fontSize: 12, color: MUTED }}>View only</div>
      )}

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 14 }}>
        {/* Left: sections */}
        <div style={{ border: "1px solid #222", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Sections</div>

          {loadingSections ? <div style={{ color: MUTED }}>Loading…</div> : null}

          {!loadingSections && sections.length === 0 ? (
            <div style={{ color: MUTED }}>No sections yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {sections.map((s) => {
                const active = selectedId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    style={{
                      textAlign: "left",
                      padding: 12,
                      borderRadius: 10,
                      border: active ? "2px solid #2a60ff" : "1px solid #333",
                      background: "transparent",
                      cursor: "pointer",
                      color: FG,
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>{s.title}</div>
                    <div style={{ opacity: 0.8, fontSize: 12 }}>{rowMode(s).toUpperCase()}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: selected section + entries */}
        <div style={{ border: "1px solid #222", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Selected section</div>

          {!selected ? (
            <div style={{ color: MUTED }}>Click a section on the left.</div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {/* Section header + edit/delete */}
              <div style={{ display: "grid", gap: 8 }}>
                {!editingSection ? (
                  <>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>{selected.title}</div>
                    <div style={{ color: MUTED, fontSize: 12 }}>Mode: {rowMode(selected).toUpperCase()}</div>
                    {selected.description ? (
                      <div style={{ whiteSpace: "pre-wrap", opacity: 0.95 }}>{selected.description}</div>
                    ) : (
                      <div style={{ color: MUTED, fontSize: 12 }}>No section description.</div>
                    )}

                    {canEdit ? (
                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          type="button"
                          onClick={() => setEditingSection(true)}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 10,
                            border: "1px solid #333",
                            background: "transparent",
                            color: FG,
                            cursor: "pointer",
                            fontWeight: 900,
                          }}
                        >
                          Edit Section
                        </button>
                        <button
                          type="button"
                          onClick={deleteSection}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 10,
                            border: "1px solid #333",
                            background: "transparent",
                            color: "#ff8080",
                            cursor: "pointer",
                            fontWeight: 900,
                          }}
                        >
                          Delete Section
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 900 }}>Edit section</div>

                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      style={{
                        width: "100%",
                        padding: 10,
                        borderRadius: 10,
                        border: "1px solid #333",
                        background: "transparent",
                        color: FG,
                      }}
                    />

                    <select
                      value={editMode}
                      onChange={(e) => setEditMode(e.target.value as Mode)}
                      style={{
                        padding: 10,
                        borderRadius: 10,
                        border: "1px solid #333",
                        background: "transparent",
                        color: FG,
                      }}
                    >
                      <option value="discussion">Discussion</option>
                      <option value="readonly">Read only</option>
                    </select>

                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="Optional section description"
                      rows={4}
                      style={{
                        width: "100%",
                        padding: 10,
                        borderRadius: 10,
                        border: "1px solid #333",
                        background: "transparent",
                        color: FG,
                        resize: "vertical",
                      }}
                    />

                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        type="button"
                        onClick={saveSectionEdits}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: "1px solid #333",
                          background: "transparent",
                          color: FG,
                          cursor: "pointer",
                          fontWeight: 900,
                        }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingSection(false)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: "1px solid #333",
                          background: "transparent",
                          color: FG,
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Entries */}
              <div style={{ borderTop: "1px solid #222", paddingTop: 12 }}>
                <div style={{ fontWeight: 900, marginBottom: 10 }}>Entries in this section</div>

                {canEdit ? (
                  <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                    <input
                      value={entryTitle}
                      onChange={(e) => setEntryTitle(e.target.value)}
                      placeholder="Entry title"
                      style={{
                        width: "100%",
                        padding: 10,
                        borderRadius: 10,
                        border: "1px solid #333",
                        background: "transparent",
                        color: FG,
                      }}
                    />
                    <textarea
                      value={entryBody}
                      onChange={(e) => setEntryBody(e.target.value)}
                      placeholder="Write your guide content here…"
                      rows={6}
                      style={{
                        width: "100%",
                        padding: 10,
                        borderRadius: 10,
                        border: "1px solid #333",
                        background: "transparent",
                        color: FG,
                        resize: "vertical",
                      }}
                    />
                    <button
                      type="button"
                      onClick={createEntry}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #333",
                        background: "transparent",
                        color: FG,
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                    >
                      Add Entry
                    </button>
                  </div>
                ) : null}

                {entriesErr ? (
                  <div style={{ color: "#ff8080", fontSize: 12, whiteSpace: "pre-wrap", marginBottom: 10 }}>
                    {entriesErr}
                  </div>
                ) : null}

                {loadingEntries ? <div style={{ color: MUTED }}>Loading…</div> : null}

                {!loadingEntries && entries.length === 0 ? (
                  <div style={{ color: MUTED }}>No entries yet.</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {entries.map((e) => {
                      const isEditing = editingEntryId === e.id;
                      return (
                        <div key={e.id} style={{ border: "1px solid #333", borderRadius: 10, padding: 10 }}>
                          {!isEditing ? (
                            <>
                              <div style={{ fontWeight: 900 }}>{e.title}</div>
                              {e.updated_at ? (
                                <div style={{ color: MUTED, fontSize: 12 }}>{new Date(e.updated_at).toLocaleString()}</div>
                              ) : null}
                              <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{e.body}</div>

                              {canEdit ? (
                                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                                  <button
                                    type="button"
                                    onClick={() => startEditEntry(e)}
                                    style={{
                                      padding: "8px 10px",
                                      borderRadius: 10,
                                      border: "1px solid #333",
                                      background: "transparent",
                                      color: FG,
                                      cursor: "pointer",
                                      fontWeight: 900,
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteEntry(e.id)}
                                    style={{
                                      padding: "8px 10px",
                                      borderRadius: 10,
                                      border: "1px solid #333",
                                      background: "transparent",
                                      color: "#ff8080",
                                      cursor: "pointer",
                                      fontWeight: 900,
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              ) : null}
                            </>
                          ) : (
                            <>
                              <div style={{ fontWeight: 900, marginBottom: 8 }}>Edit entry</div>
                              <input
                                value={editEntryTitle}
                                onChange={(x) => setEditEntryTitle(x.target.value)}
                                style={{
                                  width: "100%",
                                  padding: 10,
                                  borderRadius: 10,
                                  border: "1px solid #333",
                                  background: "transparent",
                                  color: FG,
                                }}
                              />
                              <textarea
                                value={editEntryBody}
                                onChange={(x) => setEditEntryBody(x.target.value)}
                                rows={6}
                                style={{
                                  width: "100%",
                                  padding: 10,
                                  borderRadius: 10,
                                  border: "1px solid #333",
                                  background: "transparent",
                                  color: FG,
                                  resize: "vertical",
                                  marginTop: 8,
                                }}
                              />
                              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                                <button
                                  type="button"
                                  onClick={saveEntry}
                                  style={{
                                    padding: "8px 10px",
                                    borderRadius: 10,
                                    border: "1px solid #333",
                                    background: "transparent",
                                    color: FG,
                                    cursor: "pointer",
                                    fontWeight: 900,
                                  }}
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingEntryId(null)}
                                  style={{
                                    padding: "8px 10px",
                                    borderRadius: 10,
                                    border: "1px solid #333",
                                    background: "transparent",
                                    color: FG,
                                    cursor: "pointer",
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
