import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { GUIDE_MEDIA_BUCKET } from "../../lib/storageBuckets";
import { useGuidesEditAccess } from "../../hooks/useGuidesEditAccess";
import GuideEntryAttachmentsPanel from "../../components/guides/GuideEntryAttachmentsPanel";
import GuideSectionAttachmentsPanel from "../../components/guides/GuideSectionAttachmentsPanel";
import { useRealtimeRefresh } from "../../hooks/useRealtimeRefresh";

type SectionRow = Record<string, any>;
type EntryRow = Record<string, any>;

type BlockType = "heading" | "text" | "checklist" | "image";

type PageBlock =
  | { id: string; type: "heading"; text?: string }
  | { id: string; type: "text"; text?: string }
  | { id: string; type: "checklist"; items?: string[]; checked?: boolean[] }
  | { id: string; type: "image"; storage_path: string; file_name?: string; mime_type?: string | null; caption?: string };

type NotebookMeta = {
  parentEntryId: string | null;
  sortKey: number | null;
};

type NotebookDoc = {
  meta: NotebookMeta;
  blocks: PageBlock[];
};

const SECTION_NAME_COL = "title";
const BODY_JSON_PREFIX = "__NOTEBOOK_JSON__:";

function s(v: unknown) {
  return String(v ?? "").trim();
}

function asNum(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function makeId() {
  return `blk_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function safeKeyPart(v: string) {
  return String(v || "").replace(/[^\w.\-]+/g, "_");
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

function emptyMeta(): NotebookMeta {
  return { parentEntryId: null, sortKey: null };
}

function normalizeBlock(raw: any): PageBlock | null {
  const type = String(raw?.type || "").trim() as BlockType;
  if (!["heading", "text", "checklist", "image"].includes(type)) return null;

  if (type === "heading") {
    return { id: s(raw?.id) || makeId(), type, text: String(raw?.text ?? "") };
  }

  if (type === "text") {
    return { id: s(raw?.id) || makeId(), type, text: String(raw?.text ?? "") };
  }

  if (type === "image") {
    const storagePath = String(raw?.storage_path ?? "");
    if (!storagePath) return null;
    return {
      id: s(raw?.id) || makeId(),
      type: "image",
      storage_path: storagePath,
      file_name: String(raw?.file_name ?? ""),
      mime_type: raw?.mime_type ?? null,
      caption: String(raw?.caption ?? ""),
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

function parseStoredBody(raw: unknown): NotebookDoc {
  const body = String(raw ?? "");

  if (!body.trim()) {
    return {
      meta: emptyMeta(),
      blocks: [makeTextBlock("")],
    };
  }

  if (body.startsWith(BODY_JSON_PREFIX)) {
    try {
      const parsed = JSON.parse(body.slice(BODY_JSON_PREFIX.length));

      if (Array.isArray(parsed)) {
        const blocks = parsed.map(normalizeBlock).filter(Boolean) as PageBlock[];
        return {
          meta: emptyMeta(),
          blocks: blocks.length ? blocks : [makeTextBlock("")],
        };
      }

      if (parsed && typeof parsed === "object") {
        const meta: NotebookMeta = {
          parentEntryId: s(parsed?.meta?.parentEntryId) || null,
          sortKey: asNum(parsed?.meta?.sortKey),
        };

        const blocks = Array.isArray(parsed?.blocks)
          ? (parsed.blocks.map(normalizeBlock).filter(Boolean) as PageBlock[])
          : [];

        return {
          meta,
          blocks: blocks.length ? blocks : [makeTextBlock("")],
        };
      }
    } catch {}
  }

  return {
    meta: emptyMeta(),
    blocks: [makeTextBlock(body)],
  };
}

function serializeDoc(meta: NotebookMeta, blocks: PageBlock[]): string {
  const cleaned = blocks
    .map(normalizeBlock)
    .filter(Boolean)
    .map((b) => {
      if (b!.type === "heading" || b!.type === "text") {
        return {
          id: b!.id,
          type: b!.type,
          text: String((b as any).text ?? ""),
        };
      }

      if (b!.type === "image") {
        return {
          id: b!.id,
          type: "image",
          storage_path: (b as any).storage_path,
          file_name: String((b as any).file_name ?? ""),
          mime_type: (b as any).mime_type ?? null,
          caption: String((b as any).caption ?? ""),
        };
      }

      return {
        id: b!.id,
        type: "checklist",
        items: Array.isArray((b as any).items) ? (b as any).items.map((x: any) => String(x ?? "")) : [],
        checked: Array.isArray((b as any).checked) ? (b as any).checked.map((x: any) => !!x) : [],
      };
    });

  return BODY_JSON_PREFIX + JSON.stringify({
    version: 3,
    meta: {
      parentEntryId: meta.parentEntryId || null,
      sortKey: meta.sortKey ?? null,
    },
    blocks: cleaned,
  });
}

async function resolveImageUrls(blocks: PageBlock[]): Promise<Record<string, string>> {
  const next: Record<string, string> = {};

  for (const block of blocks) {
    if (block.type !== "image") continue;

    const signed = await supabase.storage
      .from(GUIDE_MEDIA_BUCKET)
      .createSignedUrl(block.storage_path, 60 * 30);

    if (!signed.error && signed.data?.signedUrl) {
      next[block.id] = signed.data.signedUrl;
    }
  }

  return next;
}

function collectDescendantIds(parentId: string, childMap: Map<string, EntryRow[]>, out: Set<string>) {
  const kids = childMap.get(parentId) || [];
  for (const child of kids) {
    const id = String(child.id || "");
    if (!id || out.has(id)) continue;
    out.add(id);
    collectDescendantIds(id, childMap, out);
  }
}

function renderBlock(block: PageBlock, imageUrls: Record<string, string>) {
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

  if (block.type === "image") {
    return (
      <div key={block.id} style={{ display: "grid", gap: 8 }}>
        {imageUrls[block.id] ? (
          <img
            src={imageUrls[block.id]}
            alt={block.file_name || "Guide image"}
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          />
        ) : (
          <div
            style={{
              minHeight: 220,
              display: "grid",
              placeItems: "center",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              opacity: 0.72,
            }}
          >
            image loading…
          </div>
        )}

        {s(block.caption) ? (
          <div style={{ opacity: 0.74, fontSize: 12 }}>
            {block.caption}
          </div>
        ) : null}
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
      {String((block as any).text ?? "")}
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
  const [savingOrder, setSavingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newSectionName, setNewSectionName] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState("");

  const [newEntryTitle, setNewEntryTitle] = useState("");
  const [newEntryBody, setNewEntryBody] = useState("");
  const [newEntryParentId, setNewEntryParentId] = useState<string | null>(null);

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingEntryTitle, setEditingEntryTitle] = useState("");
  const [editingBlocks, setEditingBlocks] = useState<PageBlock[]>([]);
  const [editingParentId, setEditingParentId] = useState<string | null>(null);

  const [selectedImageUrls, setSelectedImageUrls] = useState<Record<string, string>>({});
  const [editingImageUrls, setEditingImageUrls] = useState<Record<string, string>>({});

  const [collapsedEntryIds, setCollapsedEntryIds] = useState<string[]>([]);

  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const entryDocsById = useMemo(() => {
    const map = new Map<string, NotebookDoc>();
    for (const entry of entries) {
      const id = String(entry.id || "");
      if (!id) continue;
      map.set(id, parseStoredBody(entry.body ?? ""));
    }
    return map;
  }, [entries]);

  const entryMapById = useMemo(() => {
    const map = new Map<string, EntryRow>();
    for (const entry of entries) {
      const id = String(entry.id || "");
      if (!id) continue;
      map.set(id, entry);
    }
    return map;
  }, [entries]);

  function compareEntries(a: EntryRow, b: EntryRow) {
    const da = entryDocsById.get(String(a.id || ""))?.meta.sortKey;
    const db = entryDocsById.get(String(b.id || ""))?.meta.sortKey;

    const aHas = Number.isFinite(da as number);
    const bHas = Number.isFinite(db as number);

    if (aHas && bHas && da !== db) return Number(da) - Number(db);
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;

    const ta = Date.parse(String(a.created_at || 0)) || 0;
    const tb = Date.parse(String(b.created_at || 0)) || 0;
    if (ta !== tb) return ta - tb;

    return String(a.title || "").localeCompare(String(b.title || ""));
  }

  function getParentIdForEntry(entryId: string): string | null {
    return entryDocsById.get(String(entryId || ""))?.meta.parentEntryId || null;
  }

  function getSortKeyForEntry(entryId: string): number | null {
    return entryDocsById.get(String(entryId || ""))?.meta.sortKey ?? null;
  }

  function getChildren(parentId: string | null): EntryRow[] {
    return [...entries]
      .filter((entry) => {
        const pid = getParentIdForEntry(String(entry.id || ""));
        return (pid || null) === (parentId || null);
      })
      .sort(compareEntries);
  }

  const childMap = useMemo(() => {
    const map = new Map<string, EntryRow[]>();

    for (const entry of entries) {
      const id = String(entry.id || "");
      if (!id) continue;

      const pid = getParentIdForEntry(id);
      if (!pid || !entryMapById.has(pid) || pid === id) continue;

      if (!map.has(pid)) map.set(pid, []);
      map.get(pid)!.push(entry);
    }

    for (const [k, arr] of map.entries()) {
      map.set(k, [...arr].sort(compareEntries));
    }

    return map;
  }, [entries, entryDocsById, entryMapById]);

  const rootEntries = useMemo(() => {
    return [...entries]
      .filter((entry) => {
        const id = String(entry.id || "");
        const pid = getParentIdForEntry(id);
        return !pid || !entryMapById.has(pid) || pid === id;
      })
      .sort(compareEntries);
  }, [entries, entryDocsById, entryMapById]);

  const parentIdsWithChildren = useMemo(() => Array.from(childMap.keys()), [childMap]);

  const selectedSection = useMemo(
    () => sections.find((x) => String(x.id) === String(selectedSectionId || "")) ?? null,
    [sections, selectedSectionId]
  );

  const selectedEntry = useMemo(
    () => entries.find((x) => String(x.id) === String(selectedEntryId || "")) ?? null,
    [entries, selectedEntryId]
  );

  const selectedEntryDoc = useMemo(
    () => parseStoredBody(selectedEntry?.body ?? ""),
    [selectedEntry]
  );

  const selectedEntryBlocks = selectedEntryDoc.blocks;
  const selectedEntryParentId = selectedEntryDoc.meta.parentEntryId || null;
  const selectedParentEntry = selectedEntryParentId ? entryMapById.get(selectedEntryParentId) ?? null : null;

  const invalidParentIds = useMemo(() => {
    const out = new Set<string>();
    if (!editingEntryId) return out;
    out.add(editingEntryId);
    collectDescendantIds(editingEntryId, childMap, out);
    return out;
  }, [editingEntryId, childMap]);

  function isOwnEntry(entry: EntryRow) {
    return !!currentUserId && String(entry?.created_by || "") === String(currentUserId);
  }

  function canEditEntry(entry: EntryRow) {
    return canEditAll || isOwnEntry(entry);
  }

  function isCollapsed(entryId: string) {
    return collapsedEntryIds.includes(entryId);
  }

  function toggleCollapsed(entryId: string) {
    setCollapsedEntryIds((prev) =>
      prev.includes(entryId) ? prev.filter((x) => x !== entryId) : [...prev, entryId]
    );
  }

  function collapseAllGroups() {
    setCollapsedEntryIds(parentIdsWithChildren);
  }

  function expandAllGroups() {
    setCollapsedEntryIds([]);
  }

  function expandEntryPath(entryId: string) {
    const toOpen = new Set<string>();
    let currentId = String(entryId || "");

    while (currentId) {
      const parentId = getParentIdForEntry(currentId);
      if (!parentId) break;
      toOpen.add(parentId);
      currentId = parentId;
    }

    if (!toOpen.size) return;
    setCollapsedEntryIds((prev) => prev.filter((id) => !toOpen.has(id)));
  }

  function getNextSortKey(parentId: string | null) {
  const sibs = getChildren(parentId);
  const vals = sibs
    .map((x) => getSortKeyForEntry(String(x.id || "")))
    .filter((x): x is number => Number.isFinite(x as number));

  if (!vals.length) return sibs.length + 1;
  return Math.max(...vals) + 1;
}

async function saveEntryMeta(entry: EntryRow, nextMeta: Partial<NotebookMeta>) {
  const doc = parseStoredBody(entry.body ?? "");
  const merged: NotebookMeta = {
    parentEntryId: doc.meta.parentEntryId || null,
    sortKey: doc.meta.sortKey ?? null,
    ...nextMeta,
  };

  const body = serializeDoc(merged, doc.blocks);

  return safeUpdateById("guide_section_entries", String(entry.id), {
    body,
    updated_at: new Date().toISOString(),
  });
}
async function moveEntryUpDown(entryId: string, dir: -1 | 1) {
    const id = String(entryId || "");
    if (!id) return;

    const parentId = getParentIdForEntry(id);
    const sibs = getChildren(parentId);
    const ids = sibs.map((x) => String(x.id));
    const idx = ids.indexOf(id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= ids.length) return;

    const clone = [...ids];
    const temp = clone[idx];
    clone[idx] = clone[swapIdx];
    clone[swapIdx] = temp;

    try {
      setSavingOrder(true);
      await persistSiblingOrder(parentId, clone);
      await loadEntries(String(selectedSectionId || ""));
    } catch (e: any) {
      setError(String(e?.message || e || "Reorder failed"));
    } finally {
      setSavingOrder(false);
    }
  }

  async function indentEntry(entryId: string) {
    const id = String(entryId || "");
    if (!id) return;

    const parentId = getParentIdForEntry(id);
    const sibs = getChildren(parentId);
    const ids = sibs.map((x) => String(x.id));
    const idx = ids.indexOf(id);
    if (idx <= 0) return;

    const newParentId = ids[idx - 1];
    if (!newParentId || newParentId === id) return;

    const oldGroup = ids.filter((x) => x !== id);
    const newGroup = [...getChildren(newParentId).map((x) => String(x.id)), id];

    try {
      setSavingOrder(true);
      await persistSiblingOrder(parentId, oldGroup);
      await persistSiblingOrder(newParentId, newGroup);
      expandEntryPath(id);
      await loadEntries(String(selectedSectionId || ""));
    } catch (e: any) {
      setError(String(e?.message || e || "Indent failed"));
    } finally {
      setSavingOrder(false);
    }
  }

  async function outdentEntry(entryId: string) {
    const id = String(entryId || "");
    if (!id) return;

    const parentId = getParentIdForEntry(id);
    if (!parentId) return;

    const parentEntry = entryMapById.get(parentId);
    if (!parentEntry) return;

    const grandParentId = getParentIdForEntry(parentId);
    const oldGroup = getChildren(parentId).map((x) => String(x.id)).filter((x) => x !== id);

    const grandIds = getChildren(grandParentId).map((x) => String(x.id));
    const parentIdx = grandIds.indexOf(parentId);
    if (parentIdx < 0) return;

    const nextGrand = [...grandIds];
    nextGrand.splice(parentIdx + 1, 0, id);

    try {
      setSavingOrder(true);
      await persistSiblingOrder(parentId, oldGroup);

      const seen = new Set<string>();
      const deduped = nextGrand.filter((x) => {
        if (seen.has(x)) return false;
        seen.add(x);
        return true;
      });

      await persistSiblingOrder(grandParentId, deduped);
      expandEntryPath(id);
      await loadEntries(String(selectedSectionId || ""));
    } catch (e: any) {
      setError(String(e?.message || e || "Outdent failed"));
    } finally {
      setSavingOrder(false);
    }
  }

  function canIndent(entry: EntryRow, depth: number) {
    const parentId = getParentIdForEntry(String(entry.id || ""));
    const sibs = getChildren(parentId).map((x) => String(x.id));
    const idx = sibs.indexOf(String(entry.id || ""));
    return idx > 0;
  }

  function canOutdent(entry: EntryRow, depth: number) {
    return depth > 0 && !!getParentIdForEntry(String(entry.id || ""));
  }

  function canMoveUp(entry: EntryRow) {
    const parentId = getParentIdForEntry(String(entry.id || ""));
    const sibs = getChildren(parentId).map((x) => String(x.id));
    return sibs.indexOf(String(entry.id || "")) > 0;
  }

  function canMoveDown(entry: EntryRow) {
    const parentId = getParentIdForEntry(String(entry.id || ""));
    const sibs = getChildren(parentId).map((x) => String(x.id));
    const idx = sibs.indexOf(String(entry.id || ""));
    return idx >= 0 && idx < sibs.length - 1;
  }

  function startEditEntry(entry: EntryRow) {
    if (!canEditEntry(entry)) return;
    const doc = parseStoredBody(entry.body ?? "");
    setEditingEntryId(String(entry.id));
    setEditingEntryTitle(String(entry.title || ""));
    setEditingBlocks(doc.blocks);
    setEditingParentId(doc.meta.parentEntryId || null);
  }

  function stopEditEntry() {
    setEditingEntryId(null);
    setEditingEntryTitle("");
    setEditingBlocks([]);
    setEditingParentId(null);
    setEditingImageUrls({});
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
      prev.map((b) => (String(b.id) === String(blockId) ? ({ ...b, ...patch } as PageBlock) : b))
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

  async function addImageBlocks(files: FileList | null) {
    if (!files || !files.length) return;
    if (!editingEntryId || !selectedSectionId) {
      setError("Create and open a page first, then add images while editing.");
      return;
    }

    const userRes = await supabase.auth.getUser();
    const uid = userRes.data?.user?.id || null;
    if (!uid) {
      setError("You must be logged in to upload images.");
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const safeName = safeKeyPart(file.name || `image-${Date.now()}.png`);
      const storagePath = `${allianceCode}/inline/${selectedSectionId}/${editingEntryId}/${Date.now()}-${safeName}`;

      const up = await supabase.storage.from(GUIDE_MEDIA_BUCKET).upload(storagePath, file, {
        upsert: false,
        contentType: file.type || undefined,
      });

      if (up.error) {
        setError(up.error.message);
        return;
      }

      const newBlock: PageBlock = {
        id: makeId(),
        type: "image",
        storage_path: storagePath,
        file_name: file.name || safeName,
        mime_type: file.type || null,
        caption: "",
      };

      setEditingBlocks((prev) => [...prev, newBlock]);
    }
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

  useEffect(() => {
    let dead = false;
    (async () => {
      const urls = await resolveImageUrls(selectedEntryBlocks);
      if (!dead) setSelectedImageUrls(urls);
    })();
    return () => { dead = true; };
  }, [selectedEntryBlocks]);

  useEffect(() => {
    let dead = false;
    (async () => {
      const urls = await resolveImageUrls(editingBlocks);
      if (!dead) setEditingImageUrls(urls);
    })();
    return () => { dead = true; };
  }, [editingBlocks]);

  useEffect(() => {
    if (selectedEntryId) expandEntryPath(selectedEntryId);
  }, [selectedEntryId, entryDocsById]);

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
      setNewEntryParentId(null);
      setCollapsedEntryIds([]);
    } else {
      setEntries([]);
      setSelectedEntryId(null);
      stopEditEntry();
      setNewEntryParentId(null);
      setCollapsedEntryIds([]);
    }
  }, [selectedSectionId]);

  async function createSection() {
    if (!canEditAll) return;
    if (!allianceCode) return;
    const name = newSectionName.trim();
    if (!name) return;

    setError(null);

    const { error } = await supabase.from("guide_sections").insert({
      alliance_code: allianceCode,
      [SECTION_NAME_COL]: name,
    } as any);

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

  const up = await safeUpdateById("guide_sections", editingSectionId, {
    [SECTION_NAME_COL]: name,
    updated_at: new Date().toISOString(),
  });

  if (up.error) {
    const msg = String(up.error.message || "Section save failed");
    setError(msg);
    alert(msg);
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

    const blocks = [makeTextBlock(newEntryBody)];
    const body = serializeDoc(
      {
        parentEntryId: newEntryParentId || null,
        sortKey: getNextSortKey(newEntryParentId || null),
      },
      blocks
    );

    setError(null);

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user) {
      setError("You must be logged in to create an entry.");
      return;
    }

    const ins = await supabase
      .from("guide_section_entries")
      .insert({
        section_id: selectedSectionId,
        alliance_code: allianceCode,
        title,
        body,
        created_by: userRes.user.id,
      } as any)
      .select("*")
      .single();

    if (ins.error) {
      setError(ins.error.message);
      return;
    }

    setNewEntryTitle("");
    setNewEntryBody("");
    setNewEntryParentId(null);
    await loadEntries(selectedSectionId);
    if (ins.data?.id) setSelectedEntryId(String(ins.data.id));
  }

  async function saveEditEntry() {
  if (!editingEntryId || !selectedSectionId) return;

  const existing = entries.find((x) => String(x.id) === String(editingEntryId));
  if (!existing || !canEditEntry(existing)) return;

  const title = editingEntryTitle.trim();
  if (!title) return;

  const currentDoc = parseStoredBody(existing.body ?? "");
  const oldParentId = currentDoc.meta.parentEntryId || null;
  const nextParentId = editingParentId && editingParentId !== editingEntryId ? editingParentId : null;

  const nextSortKey =
    oldParentId === nextParentId
      ? (currentDoc.meta.sortKey ?? getNextSortKey(nextParentId))
      : getNextSortKey(nextParentId);

  const body = serializeDoc(
    { parentEntryId: nextParentId, sortKey: nextSortKey },
    editingBlocks
  );

  setError(null);

  const up = await safeUpdateById("guide_section_entries", editingEntryId, {
    title,
    body,
    updated_at: new Date().toISOString(),
  });

  if (up.error) {
    const msg = String(up.error.message || "Entry save failed");
    setError(msg);
    alert(msg);
    return;
  }

  if (oldParentId !== nextParentId) {
    try {
      setSavingOrder(true);
      await persistSiblingOrder(
        oldParentId,
        getChildren(oldParentId).map((x) => String(x.id)).filter((x) => x !== editingEntryId)
      );
    } catch {}
    finally {
      setSavingOrder(false);
    }
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

  function renderEntryNode(entry: EntryRow, depth = 0): React.ReactNode {
    const id = String(entry.id || "");
    const selected = id === String(selectedEntryId || "");
    const own = isOwnEntry(entry);
    const children = childMap.get(id) || [];
    const hasChildren = children.length > 0;
    const collapsed = hasChildren ? isCollapsed(id) : false;
    const editAllowed = canEditEntry(entry);

    return (
      <div key={id} style={{ display: "grid", gap: 8 }}>
        <div style={{ marginLeft: depth * 16, display: "flex", gap: 8, alignItems: "stretch" }}>
          <div style={{ width: 34, flex: "0 0 34px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {hasChildren ? (
              <button
                type="button"
                className="zombie-btn"
                onClick={() => toggleCollapsed(id)}
                style={{ width: 34, minWidth: 34, padding: "8px 0", borderRadius: 10 }}
                title={collapsed ? "Expand" : "Collapse"}
              >
                {collapsed ? "▸" : "▾"}
              </button>
            ) : (
              <div style={{ opacity: 0.35, fontSize: 12 }}>•</div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedEntryId(id);
              stopEditEntry();
            }}
            className="zombie-btn"
            style={{
              flex: 1,
              textAlign: "left",
              padding: 12,
              borderRadius: 14,
              border: selected ? "1px solid rgba(255,255,255,0.20)" : "1px solid rgba(255,255,255,0.10)",
              background: selected ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)",
            }}
          >
            <div style={{ fontWeight: 900 }}>{s(entry.title || "Untitled")}</div>
            <div style={{ opacity: 0.68, fontSize: 12, marginTop: 4 }}>
              {niceDate(entry.updated_at || entry.created_at)}
            </div>
            <div style={{ opacity: 0.68, fontSize: 11, marginTop: 4 }}>
              {depth > 0 ? "Subpage" : "Page"}
              {own ? " • Yours" : ""}
              {hasChildren ? ` • ${children.length} child${children.length === 1 ? "" : "ren"}` : ""}
            </div>
          </button>
        </div>

        {editAllowed ? (
          <div style={{ marginLeft: depth * 16 + 42, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button className="zombie-btn" type="button" disabled={!canMoveUp(entry) || savingOrder} onClick={() => void moveEntryUpDown(id, -1)}>
              ↑ Up
            </button>
            <button className="zombie-btn" type="button" disabled={!canMoveDown(entry) || savingOrder} onClick={() => void moveEntryUpDown(id, 1)}>
              ↓ Down
            </button>
            <button className="zombie-btn" type="button" disabled={!canIndent(entry, depth) || savingOrder} onClick={() => void indentEntry(id)}>
              → Indent
            </button>
            <button className="zombie-btn" type="button" disabled={!canOutdent(entry, depth) || savingOrder} onClick={() => void outdentEntry(id)}>
              ← Outdent
            </button>
          </div>
        ) : null}

        {hasChildren && !collapsed ? (
          <div style={{ display: "grid", gap: 8 }}>
            {children.map((child) => renderEntryNode(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
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
              Sections at the top. Pages and subpages on the left. Notebook content on the right.
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
                {savingOrder ? <span> • Saving order…</span> : null}
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
            flex: "0 0 340px",
            minWidth: 320,
            maxWidth: 420,
            width: "100%",
            padding: 12,
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ opacity: 0.7, fontSize: 12 }}>Pages</div>
              <div style={{ fontWeight: 900, fontSize: 18, marginTop: 2 }}>
                {loadingEntries ? "Loading…" : `${entries.length} total`}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="zombie-btn" type="button" onClick={expandAllGroups}>
                Expand All
              </button>
              <button className="zombie-btn" type="button" onClick={collapseAllGroups}>
                Collapse All
              </button>
            </div>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="zombie-btn" type="button" onClick={() => setNewEntryParentId(null)}>
              Top-level
            </button>
            {selectedEntry && canCreateOwnEntries ? (
              <button className="zombie-btn" type="button" onClick={() => setNewEntryParentId(String(selectedEntry.id))}>
                New Subpage
              </button>
            ) : null}
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {rootEntries.map((entry) => renderEntryNode(entry, 0))}
            {!rootEntries.length ? (
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
                    Create a top-level page or a nested subpage.
                  </div>

                  {newEntryParentId ? (
                    <div
                      style={{
                        marginTop: 10,
                        padding: 10,
                        borderRadius: 12,
                        border: "1px solid rgba(120,180,255,0.28)",
                        background: "rgba(120,180,255,0.08)",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontSize: 12 }}>
                        Creating as subpage under: <b>{s(entryMapById.get(newEntryParentId)?.title || "Selected page")}</b>
                      </div>
                      <button className="zombie-btn" type="button" onClick={() => setNewEntryParentId(null)}>
                        Clear
                      </button>
                    </div>
                  ) : null}

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
                          {selectedParentEntry ? (
                            <div style={{ opacity: 0.68, fontSize: 12, marginBottom: 6 }}>
                              {s(selectedParentEntry.title)} / <b>{s(selectedEntry.title || "Untitled")}</b>
                            </div>
                          ) : null}

                          <div style={{ fontSize: 28, fontWeight: 950 }}>
                            {s(selectedEntry.title || "Untitled")}
                          </div>
                          <div style={{ opacity: 0.68, fontSize: 12, marginTop: 6 }}>
                            Created: {niceDate(selectedEntry.created_at)}
                            {selectedEntry.updated_at ? ` • Updated: ${niceDate(selectedEntry.updated_at)}` : ""}
                            {isOwnEntry(selectedEntry) ? " • Yours" : ""}
                            {selectedEntryParentId ? " • Subpage" : " • Page"}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {canCreateOwnEntries ? (
                            <button className="zombie-btn" type="button" onClick={() => setNewEntryParentId(String(selectedEntry.id))}>
                              New Subpage
                            </button>
                          ) : null}

                          {canEditEntry(selectedEntry) ? (
                            <>
                              <button className="zombie-btn" type="button" onClick={() => startEditEntry(selectedEntry)}>
                                Edit Page
                              </button>
                              <button className="zombie-btn" type="button" onClick={() => void deleteEntry(String(selectedEntry.id))}>
                                Delete Page
                              </button>
                            </>
                          ) : null}
                        </div>
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
                        {selectedEntryBlocks.map((block) => renderBlock(block, selectedImageUrls))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: 16 }}>Edit page</div>
                          <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4 }}>
                            Add headings, notes, checklists, inline image blocks, and set parent page.
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
                          <button className="zombie-btn" type="button" onClick={() => imageInputRef.current?.click()}>
                            + Image Block
                          </button>
                          <input
                            ref={imageInputRef}
                            type="file"
                            multiple
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              void addImageBlocks(e.target.files);
                              e.target.value = "";
                            }}
                          />
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

                        <div style={{ display: "grid", gap: 6 }}>
                          <div style={{ opacity: 0.72, fontSize: 12 }}>Parent page</div>
                          <select
                            className="zombie-input"
                            value={editingParentId || ""}
                            onChange={(e) => setEditingParentId(s(e.target.value) || null)}
                            style={{ padding: "10px 12px", width: "100%" }}
                          >
                            <option value="">(top-level page)</option>
                            {entries
                              .filter((entry) => !invalidParentIds.has(String(entry.id)))
                              .map((entry) => (
                                <option key={String(entry.id)} value={String(entry.id)}>
                                  {s(entry.title || "Untitled")}
                                </option>
                              ))}
                          </select>
                        </div>

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
                                {block.type === "heading"
                                  ? "Heading"
                                  : block.type === "checklist"
                                  ? "Checklist"
                                  : block.type === "image"
                                  ? "Image"
                                  : "Note"} block
                              </div>

                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button className="zombie-btn" type="button" disabled={idx === 0} onClick={() => moveBlock(block.id, -1)}>↑</button>
                                <button className="zombie-btn" type="button" disabled={idx === editingBlocks.length - 1} onClick={() => moveBlock(block.id, 1)}>↓</button>
                                <button className="zombie-btn" type="button" onClick={() => removeBlock(block.id)}>Delete</button>
                              </div>
                            </div>

                            {block.type === "heading" ? (
                              <input
                                value={String((block as any).text ?? "")}
                                onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                                className="zombie-input"
                                style={{ padding: "10px 12px", width: "100%", fontWeight: 900 }}
                                placeholder="Heading text"
                              />
                            ) : null}

                            {block.type === "text" ? (
                              <textarea
                                value={String((block as any).text ?? "")}
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

                            {block.type === "image" ? (
                              <div style={{ display: "grid", gap: 10 }}>
                                {editingImageUrls[block.id] ? (
                                  <img
                                    src={editingImageUrls[block.id]}
                                    alt={block.file_name || "Guide image"}
                                    style={{
                                      display: "block",
                                      width: "100%",
                                      height: "auto",
                                      borderRadius: 14,
                                      border: "1px solid rgba(255,255,255,0.08)",
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      minHeight: 220,
                                      display: "grid",
                                      placeItems: "center",
                                      borderRadius: 14,
                                      border: "1px solid rgba(255,255,255,0.08)",
                                      opacity: 0.72,
                                    }}
                                  >
                                    image loading…
                                  </div>
                                )}

                                <div style={{ opacity: 0.72, fontSize: 12 }}>
                                  {block.file_name || "Image"}
                                </div>

                                <input
                                  value={String(block.caption ?? "")}
                                  onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                                  className="zombie-input"
                                  style={{ padding: "10px 12px", width: "100%" }}
                                  placeholder="Caption (optional)"
                                />
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
function isMissingColumnError(error: any, col: string) {
  const msg = String(error?.message || "").toLowerCase();
  return msg.includes(col.toLowerCase()) && (msg.includes("column") || msg.includes("schema cache"));
}

async function safeUpdateById(
  table: string,
  id: string,
  patch: Record<string, any>
) {
  const run = (p: Record<string, any>) =>
    supabase.from(table).update(p as any).eq("id", id);

  let res = await run(patch);
  if (!res.error) return res;

  if (
    Object.prototype.hasOwnProperty.call(patch, "updated_at") &&
    isMissingColumnError(res.error, "updated_at")
  ) {
    const retry = { ...patch };
    delete retry.updated_at;
    res = await run(retry);
  }

  return res;
}







