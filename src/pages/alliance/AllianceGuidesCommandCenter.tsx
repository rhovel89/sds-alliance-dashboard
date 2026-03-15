import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useGuidesEditAccess } from "../../hooks/useGuidesEditAccess";
import GuideEntryAttachmentsPanel from "../../components/guides/GuideEntryAttachmentsPanel";
import GuideSectionAttachmentsPanel from "../../components/guides/GuideSectionAttachmentsPanel";
import { useRealtimeRefresh } from "../../hooks/useRealtimeRefresh";

type SectionRow = Record<string, any>;
type EntryRow = Record<string, any>;

type BlockType = "heading" | "text" | "checklist";

type PageBlock = {
  id: string;
  type: BlockType;
  text?: string;
  items?: string[];
  checked?: boolean[];
};

const SECTION_NAME_COL = "title";
const BODY_JSON_PREFIX = "__NOTEBOOK_JSON__:";

function s(v: unknown) {
  return String(v ?? "").trim();
}

function makeId() {
  return `blk_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function niceDate(v: unknown) {
  try {
    const d = new Date(String(v ?? ""));
    if (Number.isNaN(d.getTime())) return String(v ?? "");
    return d.toLocaleString();
  } catch {
    return String(v ?? "");
  }
}

function makeHeadingBlock(text = "New heading"): PageBlock {
  return { id: makeId(), type: "heading", text };
}

function makeTextBlock(text = ""): PageBlock {
  return { id: makeId(), type: "text", text };
}

function makeChecklistBlock(): PageBlock {
  return {
    id: makeId(),
    type: "checklist",
    items: ["New item"],
    checked: [false],
  };
}

function normalizeBlock(raw: any): PageBlock | null {
  const type = String(raw?.type || "").trim() as BlockType;
  if (!["heading", "text", "checklist"].includes(type)) return null;

  if (type === "heading") {
    return {
      id: s(raw?.id) || makeId(),
      type,
      text: String(raw?.text ?? ""),
    };
  }

  if (type === "text") {
    return {
      id: s(raw?.id) || makeId(),
      type,
      text: String(raw?.text ?? ""),
    };
  }

  const items = Array.isArray(raw?.items) ? raw.items.map((x: any) => String(x ?? "")) : [];
  const checked = Array.isArray(raw?.checked) ? raw.checked.map((x: any) => !!x) : [];
  while (checked.length < items.length) checked.push(false);

  return {
    id: s(raw?.id) || makeId(),
    type: "checklist",
    items,
    checked: checked.slice(0, items.length),
  };
}

function parseStoredBody(raw: unknown): PageBlock[] {
  const body = String(raw ?? "");

  if (!body.trim()) {
    return [makeTextBlock("")];
  }

  if (body.startsWith(BODY_JSON_PREFIX)) {
    try {
      const parsed = JSON.parse(body.slice(BODY_JSON_PREFIX.length));
      if (Array.isArray(parsed)) {
        const blocks = parsed.map(normalizeBlock).filter(Boolean) as PageBlock[];
        if (blocks.length) return blocks;
      }
    } catch {}
  }

  return [makeTextBlock(body)];
}

function serializeBlocks(blocks: PageBlock[]): string {
  const cleaned = blocks
    .map(normalizeBlock)
    .filter(Boolean)
    .map((b) => {
      if (b!.type === "heading" || b!.type === "text") {
        return {
          id: b!.id,
          type: b!.type,
          text: String(b!.text ?? ""),
        };
      }

      return {
        id: b!.id,
        type: "checklist",
        items: Array.isArray(b!.items) ? b!.items.map((x) => String(x ?? "")) : [],
        checked: Array.isArray(b!.checked) ? b!.checked.map((x) => !!x) : [],
      };
    });

  return BODY_JSON_PREFIX + JSON.stringify(cleaned);
}

function renderBlock(block: PageBlock) {
  if (block.type === "heading") {
    return (
      <div
        key={block.id}
        style={{
          fontSize: 24,
          fontWeight: 950,
          lineHeight: 1.25,
          marginBottom: 4,
        }}
      >
        {String(block.text || "").trim() || "Untitled heading"}
      </div>
    );
  }

  if (block.type === "checklist") {
    const items = Array.isArray(block.items) ? block.items : [];
    const checked = Array.isArray(block.checked) ? block.checked : [];

    return (
      <div key={block.id} style={{ display: "grid", gap: 10 }}>
        {items.length === 0 ? (
          <div style={{ opacity: 0.7 }}>Empty checklist</div>
        ) : (
          items.map((item, idx) => (
            <label
              key={`${block.id}_${idx}`}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                lineHeight: 1.6,
              }}
            >
              <input type="checkbox" checked={!!checked[idx]} readOnly />
              <span style={{ opacity: checked[idx] ? 0.7 : 0.96, textDecoration: checked[idx] ? "line-through" : "none" }}>
                {item || "(empty item)"}
              </span>
            </label>
          ))
        )}
      </div>
    );
  }

  return (
    <div
      key={block.id}
      style={{
        whiteSpace: "pre-wrap",
        lineHeight: 1.8,
        fontSize: 15,
        opacity: 0.96,
      }}
    >
      {String(block.text ?? "")}
    </div>
  );
}

export function AllianceGuidesCommandCenter() {
  const { alliance_id } = useParams();
  const allianceCode = useMemo(() => String(alliance_id || "").trim().toUpperCase(), [alliance_id]);

  const [currentUserId, setCurrentUserId] = useState<string>("");

  const roleState = useGuidesEditAccess(allianceCode);

  const [ownerFlags, setOwnerFlags] = useState<{ is_app_admin: boolean; is_dashboard_owner: boolean }>({
    is_app_admin: false,
    is_dashboard_owner: false,
  });

  const canEditAll =
    !!roleState.canEditGuides ||
    ownerFlags.is_app_admin ||
    ownerFlags.is_dashboard_owner;

  const canCreateOwnEntries = !!currentUserId;

  const [sections, setSections] = useState<SectionRow[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

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
  const [editingBlocks, setEditingBlocks] = useState<PageBlock[]>([]);

  const selectedSection = useMemo(
    () => sections.find((x) => String(x.id) === String(selectedSectionId || "")) ?? null,
    [sections, selectedSectionId]
  );

  const selectedEntry = useMemo(
    () => entries.find((x) => String(x.id) === String(selectedEntryId || "")) ?? null,
    [entries, selectedEntryId]
  );

  const selectedEntryBlocks = useMemo(
    () => parseStoredBody(selectedEntry?.body ?? ""),
    [selectedEntry]
  );

  function isOwnEntry(entry: EntryRow) {
    return !!currentUserId && String(entry?.created_by || "") === String(currentUserId);
  }

  function canEditEntry(entry: EntryRow) {
    return canEditAll || isOwnEntry(entry);
  }

  function startEditEntry(entry: EntryRow) {
    if (!canEditEntry(entry)) return;
    setEditingEntryId(String(entry.id));
    setEditingEntryTitle(String(entry.title || ""));
    setEditingBlocks(parseStoredBody(entry.body ?? ""));
  }

  function stopEditEntry() {
    setEditingEntryId(null);
    setEditingEntryTitle("");
    setEditingBlocks([]);
  }

  function addBlock(type: BlockType) {
    setEditingBlocks((prev) => {
      if (type === "heading") return [...prev, makeHeadingBlock()];
      if (type === "checklist") return [...prev, makeChecklistBlock()];
      return [...prev, makeTextBlock("")];
    });
  }

  function updateBlock(blockId: string, patch: Partial<PageBlock>) {
    setEditingBlocks((prev) =>
      prev.map((b) => (String(b.id) === String(blockId) ? { ...b, ...patch } : b))
    );
  }

  function removeBlock(blockId: string) {
    setEditingBlocks((prev) => prev.filter((b) => String(b.id) !== String(blockId)));
  }

  function moveBlock(blockId: string, dir: -1 | 1) {
    setEditingBlocks((prev) => {
      const idx = prev.findIndex((b) => String(b.id) === String(blockId));
      if (idx < 0) return prev;
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;

      const clone = [...prev];
      const [item] = clone.splice(idx, 1);
      clone.splice(nextIdx, 0, item);
      return clone;
    });
  }

  function updateChecklistItem(blockId: string, idx: number, value: string) {
    setEditingBlocks((prev) =>
      prev.map((b) => {
        if (String(b.id) !== String(blockId) || b.type !== "checklist") return b;
        const items = [...(b.items || [])];
        items[idx] = value;
        return { ...b, items };
      })
    );
  }

  function toggleChecklistItem(blockId: string, idx: number, checkedValue: boolean) {
    setEditingBlocks((prev) =>
      prev.map((b) => {
        if (String(b.id) !== String(blockId) || b.type !== "checklist") return b;
        const checked = [...(b.checked || [])];
        checked[idx] = checkedValue;
        return { ...b, checked };
      })
    );
  }

  function addChecklistItem(blockId: string) {
    setEditingBlocks((prev) =>
      prev.map((b) => {
        if (String(b.id) !== String(blockId) || b.type !== "checklist") return b;
        return {
          ...b,
          items: [...(b.items || []), "New item"],
          checked: [...(b.checked || []), false],
        };
      })
    );
  }

  function removeChecklistItem(blockId: string, idx: number) {
    setEditingBlocks((prev) =>
      prev.map((b) => {
        if (String(b.id) !== String(blockId) || b.type !== "checklist") return b;
        const items = [...(b.items || [])];
        const checked = [...(b.checked || [])];
        items.splice(idx, 1);
        checked.splice(idx, 1);
        return { ...b, items, checked };
      })
    );
  }

  useRealtimeRefresh({
    channel: `rt_guides_${allianceCode}`,
    enabled: !!allianceCode,
    changes: [
      { table: "guide_sections", filter: `alliance_code=eq.${allianceCode}` },
      { table: "guide_section_entries", filter: `alliance_code=eq.${allianceCode}` },
      { table: "guide_entry_attachments", filter: `alliance_code=eq.${allianceCode}` },
    ],
    onChange: () => {
      try { void loadSections(); } catch {}
      try { if (selectedSectionId) void loadEntries(selectedSectionId); } catch {}
    },
    debounceMs: 300,
  });

  useEffect(() => {
    (async () => {
      const u = await supabase.auth.getUser();
      setCurrentUserId(u.data.user?.id || "");

      const res = await supabase.rpc("my_owner_flags");
      if (!res.error && res.data && res.data[0]) {
        setOwnerFlags({
          is_app_admin: !!res.data[0].is_app_admin,
          is_dashboard_owner: !!res.data[0].is_dashboard_owner,
        });
      }
    })();
  }, []);

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
      const stillExists = selectedSectionId && rows.some((r) => String(r.id) === String(selectedSectionId));
      if (!stillExists) setSelectedSectionId(String(rows[0].id));
    } else {
      setSelectedSectionId(null);
      setSelectedEntryId(null);
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
      setSelectedEntryId(null);
      return;
    }

    const rows = (data || []) as EntryRow[];
    setEntries(rows);

    if (rows.length > 0) {
      const stillExists = selectedEntryId && rows.some((r) => String(r.id) === String(selectedEntryId));
      if (!stillExists) setSelectedEntryId(String(rows[0].id));
    } else {
      setSelectedEntryId(null);
    }
  }

  useEffect(() => {
    void loadSections();
  }, [allianceCode]);

  useEffect(() => {
    if (selectedSectionId) {
      void loadEntries(selectedSectionId);
      stopEditEntry();
    } else {
      setEntries([]);
      setSelectedEntryId(null);
      stopEditEntry();
    }
  }, [selectedSectionId]);

  async function createSection() {
    if (!canEditAll) return;
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

  function startEditSection(section: SectionRow) {
    if (!canEditAll) return;
    setEditingSectionId(String(section.id));
    setEditingSectionName(String(section[SECTION_NAME_COL] || ""));
  }

  async function saveEditSection() {
    if (!canEditAll) return;
    if (!editingSectionId) return;

    const name = editingSectionName.trim();
    if (!name) return;

    setError(null);

    const { error } = await supabase
      .from("guide_sections")
      .update({
        [SECTION_NAME_COL]: name,
        updated_at: new Date().toISOString(),
      } as any)
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
    if (!canEditAll) return;
    const ok = confirm("Delete this section? Entries inside it will be deleted too.");
    if (!ok) return;

    setError(null);

    const { error } = await supabase
      .from("guide_sections")
      .delete()
      .eq("id", sectionId);

    if (error) {
      setError(error.message);
      return;
    }

    await loadSections();
  }

  async function createEntry() {
    if (!canCreateOwnEntries) return;
    if (!allianceCode || !selectedSectionId) return;

    const title = newEntryTitle.trim();
    if (!title) return;

    const bodyBlocks = [makeTextBlock(newEntryBody)];
    const storedBody = serializeBlocks(bodyBlocks);

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
      body: storedBody,
      created_by: userRes.user.id,
    };

    const ins = await supabase
      .from("guide_section_entries")
      .insert(payload)
      .select("*")
      .single();

    if (ins.error) {
      setError(ins.error.message);
      return;
    }

    setNewEntryTitle("");
    setNewEntryBody("");
    await loadEntries(selectedSectionId);
    if (ins.data?.id) setSelectedEntryId(String(ins.data.id));
  }

  async function saveEditEntry() {
    if (!editingEntryId || !selectedSectionId) return;

    const existing = entries.find((x) => String(x.id) === String(editingEntryId));
    if (!existing || !canEditEntry(existing)) return;

    const title = editingEntryTitle.trim();
    if (!title) return;

    const storedBody = serializeBlocks(editingBlocks);

    setError(null);

    const { error } = await supabase
      .from("guide_section_entries")
      .update({
        title,
        body: storedBody,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", editingEntryId);

    if (error) {
      setError(error.message);
      return;
    }

    stopEditEntry();
    await loadEntries(selectedSectionId);
  }

  async function deleteEntry(entryId: string) {
    if (!selectedSectionId) return;

    const existing = entries.find((x) => String(x.id) === String(entryId));
    if (!existing || !canEditEntry(existing)) return;

    const ok = confirm("Delete this page?");
    if (!ok) return;

    setError(null);

    const { error } = await supabase
      .from("guide_section_entries")
      .delete()
      .eq("id", entryId);

    if (error) {
      setError(error.message);
      return;
    }

    if (String(editingEntryId || "") === String(entryId)) stopEditEntry();
    await loadEntries(selectedSectionId);
  }

  if (!allianceCode) return <div style={{ padding: 16 }}>Missing alliance id in URL.</div>;

  return (
    <div
      style={{
        padding: 16,
        display: "grid",
        gap: 14,
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        overflowX: "hidden",
      }}
    >
      <div
        className="zombie-card"
        style={{
          padding: 14,
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "linear-gradient(180deg, rgba(22,26,36,0.96), rgba(12,15,22,0.96))",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.12em", opacity: 0.68 }}>
              ALLIANCE NOTEBOOK
            </div>
            <div style={{ fontSize: 24, fontWeight: 950, marginTop: 4 }}>
              {allianceCode} Guides
            </div>
            <div style={{ opacity: 0.78, fontSize: 13, marginTop: 6 }}>
              Sections across the top. Pages down the left. Rich page blocks on the right.
            </div>
          </div>

          <div style={{ opacity: 0.86, fontSize: 13 }}>
            {roleState.loading ? (
              <span>Checking permissions…</span>
            ) : roleState.error ? (
              <span>Role check issue: {roleState.error}</span>
            ) : (
              <span>
                Mode: <b>{canEditAll ? "Manager" : canCreateOwnEntries ? "Own pages" : "View-only"}</b>
                {roleState.role ? <span> (role: {roleState.role})</span> : null}
              </span>
            )}
          </div>
        </div>

        {error ? (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(255,120,120,0.35)",
              background: "rgba(255,120,120,0.08)",
            }}
          >
            <b>Error:</b> {error}
          </div>
        ) : null}
      </div>

      <div
        className="zombie-card"
        style={{
          padding: 12,
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.03)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "stretch", overflowX: "auto", paddingBottom: 6 }}>
          {sections.map((section) => {
            const selected = String(section.id) === String(selectedSectionId || "");
            const title = s(section[SECTION_NAME_COL] || section.title || section.name || "Untitled");

            return (
              <button
                key={String(section.id)}
                type="button"
                className="zombie-btn"
                onClick={() => {
                  setSelectedSectionId(String(section.id));
                  setEditingSectionId(null);
                  setEditingSectionName("");
                }}
                style={{
                  padding: "12px 16px",
                  borderRadius: 14,
                  whiteSpace: "nowrap",
                  fontWeight: selected ? 900 : 700,
                  border: selected ? "1px solid rgba(255,255,255,0.20)" : "1px solid rgba(255,255,255,0.10)",
                  background: selected ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)",
                }}
              >
                {title}
              </button>
            );
          })}

          {canEditAll ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: 4 }}>
              <input
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="New section"
                className="zombie-input"
                style={{ padding: "10px 12px", minWidth: 180 }}
              />
              <button className="zombie-btn" type="button" onClick={createSection}>
                + Section
              </button>
            </div>
          ) : null}

          {!sections.length ? (
            <div style={{ opacity: 0.75, padding: "12px 4px" }}>No sections yet.</div>
          ) : null}
        </div>
      </div>

      {selectedSection ? (
        <div
          className="zombie-card"
          style={{
            padding: 12,
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ opacity: 0.7, fontSize: 12 }}>Selected section</div>
              <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>
                {s(selectedSection[SECTION_NAME_COL] || selectedSection.title || "Untitled")}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <GuideSectionAttachmentsPanel
                allianceCode={allianceCode}
                sectionId={String(selectedSection.id)}
                canEdit={canEditAll}
              />

              {canEditAll ? (
                <>
                  <button className="zombie-btn" type="button" onClick={() => startEditSection(selectedSection)}>
                    Rename Section
                  </button>
                  <button className="zombie-btn" type="button" onClick={() => void deleteSection(String(selectedSection.id))}>
                    Delete Section
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {canEditAll && editingSectionId === String(selectedSection.id) ? (
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                value={editingSectionName}
                onChange={(e) => setEditingSectionName(e.target.value)}
                className="zombie-input"
                style={{ padding: "10px 12px", minWidth: 240, flex: 1 }}
              />
              <button className="zombie-btn" type="button" onClick={() => void saveEditSection()}>
                Save
              </button>
              <button
                className="zombie-btn"
                type="button"
                onClick={() => {
                  setEditingSectionId(null);
                  setEditingSectionName("");
                }}
              >
                Cancel
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-start", minWidth: 0 }}>
        <div
          className="zombie-card"
          style={{
            flex: "0 0 280px",
            minWidth: 260,
            maxWidth: 320,
            width: "100%",
            padding: 12,
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div>
              <div style={{ opacity: 0.7, fontSize: 12 }}>Pages</div>
              <div style={{ fontWeight: 900, fontSize: 18, marginTop: 2 }}>
                {loadingEntries ? "Loading…" : `${entries.length} page${entries.length === 1 ? "" : "s"}`}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {entries.map((entry) => {
              const selected = String(entry.id) === String(selectedEntryId || "");
              const own = isOwnEntry(entry);

              return (
                <button
                  key={String(entry.id)}
                  type="button"
                  onClick={() => {
                    setSelectedEntryId(String(entry.id));
                    stopEditEntry();
                  }}
                  className="zombie-btn"
                  style={{
                    textAlign: "left",
                    padding: 12,
                    borderRadius: 14,
                    border: selected ? "1px solid rgba(255,255,255,0.20)" : "1px solid rgba(255,255,255,0.10)",
                    background: selected ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ fontWeight: 900 }}>
                    {s(entry.title || "Untitled")}
                  </div>
                  <div style={{ opacity: 0.68, fontSize: 12, marginTop: 4 }}>
                    {niceDate(entry.updated_at || entry.created_at)}
                  </div>
                  {own ? (
                    <div style={{ opacity: 0.68, fontSize: 11, marginTop: 4 }}>
                      Yours
                    </div>
                  ) : null}
                </button>
              );
            })}

            {!entries.length ? (
              <div style={{ opacity: 0.75, padding: "6px 2px" }}>
                No pages in this section yet.
              </div>
            ) : null}
          </div>
        </div>

        <div
          className="zombie-card"
          style={{
            flex: "1 1 720px",
            minWidth: 0,
            width: "100%",
            padding: 14,
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "linear-gradient(180deg, rgba(24,28,38,0.96), rgba(14,17,24,0.96))",
          }}
        >
          {selectedSectionId ? (
            <div style={{ display: "grid", gap: 14 }}>
              {canCreateOwnEntries ? (
                <div
                  style={{
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 16,
                    padding: 14,
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: 16 }}>New page</div>
                  <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4 }}>
                    Create a new notebook page in this section.
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                    <input
                      value={newEntryTitle}
                      onChange={(e) => setNewEntryTitle(e.target.value)}
                      placeholder="Page title"
                      className="zombie-input"
                      style={{ padding: "10px 12px", width: "100%" }}
                    />
                    <textarea
                      value={newEntryBody}
                      onChange={(e) => setNewEntryBody(e.target.value)}
                      placeholder="Starter note..."
                      rows={5}
                      className="zombie-input"
                      style={{ padding: "10px 12px", width: "100%" }}
                    />
                    <div>
                      <button className="zombie-btn" type="button" onClick={createEntry}>
                        + Add Page
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    border: "1px solid rgba(255,180,120,0.20)",
                    borderRadius: 16,
                    padding: 14,
                    background: "rgba(255,180,120,0.08)",
                  }}
                >
                  Sign in to add your own pages.
                </div>
              )}

              {selectedEntry ? (
                <div
                  style={{
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 18,
                    padding: 18,
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  {!editingEntryId || String(editingEntryId) !== String(selectedEntry.id) ? (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: 28, fontWeight: 950 }}>
                            {s(selectedEntry.title || "Untitled")}
                          </div>
                          <div style={{ opacity: 0.68, fontSize: 12, marginTop: 6 }}>
                            Created: {niceDate(selectedEntry.created_at)}
                            {selectedEntry.updated_at ? ` • Updated: ${niceDate(selectedEntry.updated_at)}` : ""}
                            {isOwnEntry(selectedEntry) ? " • Yours" : ""}
                          </div>
                        </div>

                        {canEditEntry(selectedEntry) ? (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button className="zombie-btn" type="button" onClick={() => startEditEntry(selectedEntry)}>
                              Edit Page
                            </button>
                            <button className="zombie-btn" type="button" onClick={() => void deleteEntry(String(selectedEntry.id))}>
                              Delete Page
                            </button>
                          </div>
                        ) : null}
                      </div>

                      <div
                        style={{
                          marginTop: 18,
                          paddingTop: 18,
                          borderTop: "1px solid rgba(255,255,255,0.08)",
                          display: "grid",
                          gap: 16,
                        }}
                      >
                        {selectedEntryBlocks.map(renderBlock)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: 16 }}>Edit page</div>
                          <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4 }}>
                            Add headings, note blocks, and checklist blocks.
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button className="zombie-btn" type="button" onClick={() => addBlock("heading")}>
                            + Heading
                          </button>
                          <button className="zombie-btn" type="button" onClick={() => addBlock("text")}>
                            + Note
                          </button>
                          <button className="zombie-btn" type="button" onClick={() => addBlock("checklist")}>
                            + Checklist
                          </button>
                        </div>
                      </div>

                      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                        <input
                          value={editingEntryTitle}
                          onChange={(e) => setEditingEntryTitle(e.target.value)}
                          className="zombie-input"
                          style={{ padding: "10px 12px", width: "100%", fontWeight: 900 }}
                          placeholder="Page title"
                        />

                        {editingBlocks.map((block, idx) => (
                          <div
                            key={block.id}
                            style={{
                              border: "1px solid rgba(255,255,255,0.10)",
                              borderRadius: 16,
                              padding: 12,
                              background: "rgba(255,255,255,0.03)",
                              display: "grid",
                              gap: 10,
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                              <div style={{ fontWeight: 900, opacity: 0.82 }}>
                                {block.type === "heading" ? "Heading" : block.type === "checklist" ? "Checklist" : "Note"} block
                              </div>

                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button className="zombie-btn" type="button" disabled={idx === 0} onClick={() => moveBlock(block.id, -1)}>↑</button>
                                <button className="zombie-btn" type="button" disabled={idx === editingBlocks.length - 1} onClick={() => moveBlock(block.id, 1)}>↓</button>
                                <button className="zombie-btn" type="button" onClick={() => removeBlock(block.id)}>Delete</button>
                              </div>
                            </div>

                            {block.type === "heading" ? (
                              <input
                                value={String(block.text ?? "")}
                                onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                                className="zombie-input"
                                style={{ padding: "10px 12px", width: "100%", fontWeight: 900 }}
                                placeholder="Heading text"
                              />
                            ) : null}

                            {block.type === "text" ? (
                              <textarea
                                value={String(block.text ?? "")}
                                onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                                rows={6}
                                className="zombie-input"
                                style={{ padding: "10px 12px", width: "100%" }}
                                placeholder="Write your notes here..."
                              />
                            ) : null}

                            {block.type === "checklist" ? (
                              <div style={{ display: "grid", gap: 8 }}>
                                {(block.items || []).map((item, itemIdx) => (
                                  <div key={`${block.id}_${itemIdx}`} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <input
                                      type="checkbox"
                                      checked={!!(block.checked || [])[itemIdx]}
                                      onChange={(e) => toggleChecklistItem(block.id, itemIdx, e.target.checked)}
                                    />
                                    <input
                                      value={String(item ?? "")}
                                      onChange={(e) => updateChecklistItem(block.id, itemIdx, e.target.value)}
                                      className="zombie-input"
                                      style={{ padding: "10px 12px", flex: 1 }}
                                      placeholder="Checklist item"
                                    />
                                    <button className="zombie-btn" type="button" onClick={() => removeChecklistItem(block.id, itemIdx)}>
                                      Delete
                                    </button>
                                  </div>
                                ))}

                                <div>
                                  <button className="zombie-btn" type="button" onClick={() => addChecklistItem(block.id)}>
                                    + Add Item
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ))}

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button className="zombie-btn" type="button" onClick={() => void saveEditEntry()}>
                            Save
                          </button>
                          <button className="zombie-btn" type="button" onClick={stopEditEntry}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  <div style={{ marginTop: 18 }}>
                    <GuideEntryAttachmentsPanel
                      allianceCode={allianceCode}
                      sectionId={String(selectedSectionId)}
                      entryId={String(selectedEntry.id)}
                      canEdit={canEditEntry(selectedEntry)}
                    />
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 18,
                    padding: 18,
                    background: "rgba(255,255,255,0.03)",
                    opacity: 0.82,
                  }}
                >
                  Select a page from the left rail to view it here.
                </div>
              )}
            </div>
          ) : (
            <div style={{ opacity: 0.8 }}>Select or create a section to begin.</div>
          )}
        </div>
      </div>
    </div>
  );
}
