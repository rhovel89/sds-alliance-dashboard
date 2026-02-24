import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useGuidesEditAccess } from "../../hooks/useGuidesEditAccess";
import { GuideEntriesPanel } from "../../components/guides/GuideEntriesPanel";
import GuideEntryAttachmentsPanel from "../../components/guides/GuideEntryAttachmentsPanel";

type SectionRow = Record<string, any>;
type EntryRow = Record<string, any>;

const SECTION_NAME_COL = "title";

export function AllianceGuidesCommandCenter() {
  const { alliance_id } = useParams();
  const allianceCode = useMemo(() => (alliance_id || "").toString(), [alliance_id]);

  const roleState = useGuidesEditAccess(allianceCode);
  const canEdit = !!roleState.canEditGuides;

  const [sections, setSections] = useState<SectionRow[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  const [entries, setEntries] = useState<EntryRow[]>([]);

  const [loadingSections, setLoadingSections] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newSectionName, setNewSectionName] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState("");

  const [newEntryTitle, setNewEntryTitle] = useState("");
  const [newEntryBody, setNewEntryBody] = useState("");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingEntryTitle, setEditingEntryTitle] = useState("");
  const [editingEntryBody, setEditingEntryBody] = useState("");

  async function loadSections() {
    if (!allianceCode) return;
    setError(null);
    setLoadingSections(true);

    const { data, error } = await supabase
      .from("guide_sections")
      .select("*")
      .eq("alliance_code", allianceCode)
      .order("created_at", { ascending: true });

    setLoadingSections(false);

    if (error) {
      setError(error.message);
      return;
    }

    const rows = (data || []) as SectionRow[];
    setSections(rows);

    if (rows.length > 0) {
      const stillExists = selectedSectionId && rows.some((r) => r.id === selectedSectionId);
      if (!stillExists) setSelectedSectionId(rows[0].id);
    } else {
      setSelectedSectionId(null);
    }
  }

  async function loadEntries(sectionId: string) {
    setError(null);
    setLoadingEntries(true);

    const { data, error } = await supabase
      .from("guide_section_entries")
      .select("*")
      .eq("section_id", sectionId)
      .order("created_at", { ascending: true });

    setLoadingEntries(false);

    if (error) {
      setError(error.message);
      setEntries([]);
      return;
    }

    setEntries((data || []) as EntryRow[]);
  }

  useEffect(() => {
    loadSections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allianceCode]);

  useEffect(() => {
    if (selectedSectionId) loadEntries(selectedSectionId);
    else setEntries([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSectionId]);

  async function createSection() {
    if (!canEdit) return;
    if (!allianceCode) return;
    const name = newSectionName.trim();
    if (!name) return;

    setError(null);

    const payload: Record<string, any> = {
      alliance_code: allianceCode,
      [SECTION_NAME_COL]: name,
    };

    const { error } = await supabase.from("guide_sections").insert(payload);
    if (error) {
      setError(error.message);
      return;
    }

    setNewSectionName("");
    await loadSections();
  }

  async function startEditSection(section: SectionRow) {
    if (!canEdit) return;
    setEditingSectionId(section.id);
    setEditingSectionName((section[SECTION_NAME_COL] || "").toString());
  }

  async function saveEditSection() {
    if (!canEdit) return;
    if (!editingSectionId) return;
    const name = editingSectionName.trim();
    if (!name) return;

    setError(null);

    const payload: Record<string, any> = {
      [SECTION_NAME_COL]: name,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("guide_sections")
      .update(payload)
      .eq("id", editingSectionId);

    if (error) {
      setError(error.message);
      return;
    }

    setEditingSectionId(null);
    setEditingSectionName("");
    await loadSections();
  }

  async function deleteSection(sectionId: string) {
    if (!canEdit) return;
    const ok = confirm("Delete this section? Entries inside will be deleted too.");
    if (!ok) return;

    setError(null);

    const { error } = await supabase.from("guide_sections").delete().eq("id", sectionId);
    if (error) {
      setError(error.message);
      return;
    }

    await loadSections();
  }

  async function createEntry() {
    if (!canEdit) return;
    if (!allianceCode || !selectedSectionId) return;

    const title = newEntryTitle.trim();
    const body = newEntryBody.trim();
    if (!title || !body) return;

    setError(null);

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user) {
      setError("You must be logged in to create an entry.");
      return;
    }

    const payload: Record<string, any> = {
      section_id: selectedSectionId,
      alliance_code: allianceCode,
      title,
      body,
      created_by: userRes.user.id,
    };

    const { error } = await supabase.from("guide_section_entries").insert(payload);
    if (error) {
      setError(error.message);
      return;
    }

    setNewEntryTitle("");
    setNewEntryBody("");
    await loadEntries(selectedSectionId);
  }

  function startEditEntry(entry: EntryRow) {
    if (!canEdit) return;
    setEditingEntryId(entry.id);
    setEditingEntryTitle((entry.title || "").toString());
    setEditingEntryBody((entry.body || "").toString());
  }

  async function saveEditEntry() {
    if (!canEdit) return;
    if (!editingEntryId || !selectedSectionId) return;

    const title = editingEntryTitle.trim();
    const body = editingEntryBody.trim();
    if (!title || !body) return;

    setError(null);

    const payload: Record<string, any> = {
      title,
      body,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("guide_section_entries")
      .update(payload)
      .eq("id", editingEntryId);

    if (error) {
      setError(error.message);
      return;
    }

    setEditingEntryId(null);
    setEditingEntryTitle("");
    setEditingEntryBody("");
    await loadEntries(selectedSectionId);
  }

  async function deleteEntry(entryId: string) {
    if (!canEdit) return;
    if (!selectedSectionId) return;

    const ok = confirm("Delete this entry?");
    if (!ok) return;

    setError(null);

    const { error } = await supabase.from("guide_section_entries").delete().eq("id", entryId);
    if (error) {
      setError(error.message);
      return;
    }

    await loadEntries(selectedSectionId);
  }

  if (!allianceCode) return <div style={{ padding: 16 }}>Missing alliance id in URL.</div>;

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Alliance Guides</h2>

      <div style={{ marginBottom: 12, opacity: 0.9 }}>
        {roleState.loading ? (
          <span>Checking permissions…</span>
        ) : roleState.error ? (
          <span>
            Role check issue: {roleState.error}
          </span>
        ) : (
          <span>
            Mode: <b>{canEdit ? "Editor" : "View-only"}</b>
            {roleState.role ? <span> (role: {roleState.role})</span> : null}
          </span>
        )}
      </div>

      {error ? (
        <div style={{ marginBottom: 12, padding: 10, border: "1px solid #ff6b6b" }}>
          <b>Error:</b> {error}
          <div style={{ marginTop: 6, opacity: 0.9 }}>
            (Backend RLS still enforces permissions. If you should be an editor, membership/RLS needs review.)
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* LEFT: Sections */}
        <div style={{ width: 320, border: "1px solid rgba(255,255,255,0.15)", padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <b>Sections</b>
            {loadingSections ? <span style={{ opacity: 0.8 }}>Loading…</span> : null}
          </div>

          {canEdit ? (
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <input
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="New section name"
                style={{ flex: 1 }}
              />
              <button onClick={createSection}>Add</button>
            </div>
          ) : (
            <div style={{ marginTop: 10, opacity: 0.85 }}>
              You have view-only access. (Owner/R5/R4 can edit.)
            </div>
          )}

          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {sections.map((s) => {
              const name = (s[SECTION_NAME_COL] || (s.title ?? s.name ?? s.section_name) || s.title || "Untitled").toString();
              const selected = s.id === selectedSectionId;

              return (
                <div
                  key={s.id}
                  style={{
                    padding: 10,
                    border: selected ? "1px solid rgba(120,255,120,0.5)" : "1px solid rgba(255,255,255,0.12)",
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedSectionId(s.id)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {name}
                    </div>

                    {canEdit ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditSection(s);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSection(s.id);
                          }}
                        >
                          Del
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {canEdit && editingSectionId === s.id ? (
                    <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                      <input
                        value={editingSectionName}
                        onChange={(e) => setEditingSectionName(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          saveEditSection();
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSectionId(null);
                          setEditingSectionName("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {sections.length === 0 ? <div style={{ opacity: 0.8 }}>No sections yet.</div> : null}
          </div>
        </div>

        {/* RIGHT: Entries */}
        <div style={{ flex: 1, border: "1px solid rgba(255,255,255,0.15)", padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <b>Entries</b>
            {loadingEntries ? <span style={{ opacity: 0.8 }}>Loading…</span> : null}
          </div>

          {!selectedSectionId ? (
            <div style={{ marginTop: 12, opacity: 0.85 }}>Select a section to view entries.</div>
          ) : (
            <>
              {canEdit ? (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  <input
                    value={newEntryTitle}
                    onChange={(e) => setNewEntryTitle(e.target.value)}
                    placeholder="Entry title"
                  />
                  <textarea
                    value={newEntryBody}
                    onChange={(e) => setNewEntryBody(e.target.value)}
                    placeholder="Entry body"
                    rows={6}
                  />
                  <div>
                    <button onClick={createEntry}>Add Entry</button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 10, opacity: 0.85 }}>
                  View-only access. (Owner/R5/R4 can add/edit/delete entries.)
                </div>
              )}

              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                {entries.map((en) => {
                  const isEditing = editingEntryId === en.id;

                  return (
                    <div
                      key={en.id}
                      style={{
                        padding: 12,
                        border: "1px solid rgba(255,255,255,0.12)",
                      }}
                    >
                      {!isEditing ? (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                            <div style={{ fontWeight: 700 }}>{(en.title || "Untitled").toString()}</div>

                            {canEdit ? (
                              <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => startEditEntry(en)}>Edit</button>
                                <button onClick={() => deleteEntry(en.id)}>Del</button>
                              </div>
                            ) : null}
                          </div>

                          <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                            {(en.body || "").toString()}
                          </div>
                        </>
                      ) : (
                        <>
                          <input
                            value={editingEntryTitle}
                            onChange={(e) => setEditingEntryTitle(e.target.value)}
                            style={{ width: "100%" }}
                          />
                          <textarea
                            value={editingEntryBody}
                            onChange={(e) => setEditingEntryBody(e.target.value)}
                            rows={8}
                            style={{ width: "100%", marginTop: 8 }}
                          />
                          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                            <button onClick={saveEditEntry}>Save</button>
                            <button
                              onClick={() => {
                                setEditingEntryId(null);
                                setEditingEntryTitle("");
                                setEditingEntryBody("");
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      )}
                      <GuideEntryAttachmentsPanel
                        allianceCode={allianceCode}
                        sectionId={selectedSectionId}
                        entryId={String(en.id)}
                        canEdit={canEdit}
                      />
                    </div>
                  );
                })}

                {entries.length === 0 ? (
                  <div style={{ opacity: 0.8 }}>No entries in this section yet.</div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}





