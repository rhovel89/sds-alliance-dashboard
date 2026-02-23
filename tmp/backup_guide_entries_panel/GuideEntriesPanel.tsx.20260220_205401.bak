import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Props = {
  allianceCode: string;
  sectionId: string | null;
  canEdit: boolean;
};

type AnyRow = Record<string, any>;

type Schema = {
  allianceCol: string | null;
  sectionCol: string;
  titleCol: string;
  bodyCol: string;
  idCol: string;
};

const ALLIANCE_COLS = ["alliance_code", "alliance_id", "alliance"] as const;
const SECTION_COLS = ["section_id", "guide_section_id", "guide_section", "section"] as const;
const TITLE_COLS = ["title", "name", "entry_title"] as const;
const BODY_COLS = ["body", "content", "text", "entry_body"] as const;
const ID_COLS = ["id", "entry_id"] as const;

function lower(s: any) {
  return String(s || "").toLowerCase();
}

function fmtErr(e: any) {
  if (!e) return "";
  const parts = [
    e.message ? `message: ${e.message}` : "",
    e.details ? `details: ${e.details}` : "",
    e.hint ? `hint: ${e.hint}` : "",
    e.code ? `code: ${e.code}` : "",
  ].filter(Boolean);
  return parts.join("\n");
}

function pickKey(keys: string[], candidates: readonly string[]): string | null {
  const set = new Set(keys.map((k) => k.toLowerCase()));
  for (const c of candidates) {
    if (set.has(String(c).toLowerCase())) return String(c);
  }
  return null;
}

function looksLikeMissingColumn(msg: string) {
  const m = lower(msg);
  return m.includes("does not exist") || m.includes("column") || m.includes("unknown field") || m.includes("pgrst");
}

export function GuideEntriesPanel(props: Props) {
  const allianceCode = useMemo(() => String(props.allianceCode || "").toUpperCase(), [props.allianceCode]);
  const sectionId = props.sectionId ? String(props.sectionId) : null;

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [schema, setSchema] = useState<Schema | null>(null);

  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => (selectedId ? rows.find((r) => String(r?.id ?? r?.entry_id) === selectedId) || null : null), [rows, selectedId]);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    // reset when switching sections
    setSelectedId(null);
    setTitle("");
    setBody("");
    setErr(null);
    setInfo(null);
    setRows([]);
    setSchema(null);
  }, [sectionId, allianceCode]);

  useEffect(() => {
    if (!sectionId) return;
    void loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId, allianceCode]);

  useEffect(() => {
    if (!selected) return;
    const s = schema;
    const tCol = s?.titleCol || "title";
    const bCol = s?.bodyCol || "body";
    setTitle(String(selected[tCol] ?? selected.title ?? selected.name ?? ""));
    setBody(String(selected[bCol] ?? selected.body ?? selected.content ?? selected.text ?? ""));
  }, [selectedId]);

  async function loadEntries() {
    if (!sectionId) return;
    setLoading(true);
    setErr(null);
    setInfo(null);

    const attempts: { allianceCol: string | null; sectionCol: string }[] = [];

    // Try with alliance col + section col
    for (const sc of SECTION_COLS) {
      for (const ac of ALLIANCE_COLS) attempts.push({ allianceCol: ac, sectionCol: sc });
      attempts.push({ allianceCol: null, sectionCol: sc }); // also try section-only
    }

    let lastErr: any = null;

    for (const a of attempts) {
      const q = supabase.from("guide_section_entries").select("*").eq(a.sectionCol, sectionId);
      if (a.allianceCol) q.eq(a.allianceCol as any, allianceCode);

      const res = await q;
      if (!res.error) {
        const data = (res.data || []) as AnyRow[];
        setRows(data);

        const keys = Object.keys((data[0] || {}) as AnyRow);
        const idCol = pickKey(keys, ID_COLS) || "id";
        const titleCol = pickKey(keys, TITLE_COLS) || "title";
        const bodyCol = pickKey(keys, BODY_COLS) || "body";

        setSchema({
          allianceCol: a.allianceCol,
          sectionCol: a.sectionCol,
          titleCol,
          bodyCol,
          idCol,
        });

        setInfo(`Loaded ${data.length} entries. Using cols: section=${a.sectionCol} alliance=${a.allianceCol ?? "(none)"} title=${titleCol} body=${bodyCol}`);
        setLoading(false);
        return;
      }

      lastErr = res.error;
      if (!looksLikeMissingColumn(res.error.message || "")) {
        // Could be RLS or other errors; keep for display but continue attempts
      }
    }

    setErr("Failed to load entries.\n" + fmtErr(lastErr));
    setLoading(false);
  }

  async function tryInsert(payload: AnyRow) {
    const r = await supabase.from("guide_section_entries").insert(payload as any).select("*").maybeSingle();
    if (!r.error) return { ok: true as const, row: r.data as AnyRow };
    return { ok: false as const, error: r.error };
  }

  async function createEntry() {
    if (!sectionId) return alert("Select a section first.");
    if (!props.canEdit) return alert("View-only. You do not have edit access.");

    const t = title.trim();
    if (!t) return alert("Title required.");

    setLoading(true);
    setErr(null);
    setInfo(null);

    const s = schema;

    // try a small set of payload combinations (schema-aware first)
    const sectionCols = s?.sectionCol ? [s.sectionCol] : Array.from(SECTION_COLS);
    const allianceCols = s?.allianceCol ? [s.allianceCol] : [null, ...Array.from(ALLIANCE_COLS)];
    const titleCols = s?.titleCol ? [s.titleCol] : Array.from(TITLE_COLS);
    const bodyCols = s?.bodyCol ? [s.bodyCol] : Array.from(BODY_COLS);

    let lastErr: any = null;

    for (const sc of sectionCols) {
      for (const ac of allianceCols) {
        for (const tc of titleCols.slice(0, 3)) {
          for (const bc of bodyCols.slice(0, 3)) {
            const payload: AnyRow = {};
            payload[sc] = sectionId;
            payload[tc] = t;
            payload[bc] = body;

            if (ac) payload[ac] = allianceCode;

            const ins = await tryInsert(payload);
            if (ins.ok) {
              setRows((p) => [ins.row, ...(p || [])]);
              setSelectedId(String(ins.row?.id ?? ins.row?.entry_id));
              setInfo(`Inserted. payload keys: ${Object.keys(payload).join(", ")}`);
              setLoading(false);
              return;
            }

            lastErr = ins.error;
            const msg = ins.error?.message || "";
            // If missing column, keep trying other combos quickly
            if (!looksLikeMissingColumn(msg)) {
              // If RLS denied or other, stop and show (no point trying 30 combos)
              const mm = lower(msg);
              if (mm.includes("permission") || mm.includes("rls") || mm.includes("not allowed")) {
                setErr("Insert blocked by permissions/RLS.\n" + fmtErr(ins.error));
                setLoading(false);
                return;
              }
            }
          }
        }
      }
    }

    setErr("Insert failed.\n" + fmtErr(lastErr));
    setLoading(false);
  }

  async function saveEntry() {
    if (!selectedId) return alert("Select an entry to edit.");
    if (!props.canEdit) return alert("View-only. You do not have edit access.");

    const t = title.trim();
    if (!t) return alert("Title required.");

    setLoading(true);
    setErr(null);
    setInfo(null);

    const s = schema;
    const idCol = s?.idCol || "id";

    const titleCols = s?.titleCol ? [s.titleCol] : Array.from(TITLE_COLS);
    const bodyCols = s?.bodyCol ? [s.bodyCol] : Array.from(BODY_COLS);

    let lastErr: any = null;

    for (const tc of titleCols.slice(0, 3)) {
      for (const bc of bodyCols.slice(0, 3)) {
        const payload: AnyRow = {};
        payload[tc] = t;
        payload[bc] = body;

        const r = await supabase.from("guide_section_entries").update(payload as any).eq(idCol as any, selectedId).select("*").maybeSingle();
        if (!r.error) {
          const row = r.data as AnyRow;
          setRows((p) => (p || []).map((x) => String(x?.id ?? x?.entry_id) === selectedId ? row : x));
          setInfo(`Updated. payload keys: ${Object.keys(payload).join(", ")}`);
          setLoading(false);
          return;
        }

        lastErr = r.error;
        const msg = r.error?.message || "";
        if (!looksLikeMissingColumn(msg)) {
          const mm = lower(msg);
          if (mm.includes("permission") || mm.includes("rls") || mm.includes("not allowed")) {
            setErr("Update blocked by permissions/RLS.\n" + fmtErr(r.error));
            setLoading(false);
            return;
          }
        }
      }
    }

    setErr("Update failed.\n" + fmtErr(lastErr));
    setLoading(false);
  }

  async function deleteEntry(id: string) {
    if (!props.canEdit) return alert("View-only. You do not have edit access.");
    if (!confirm("Delete this entry?")) return;

    setLoading(true);
    setErr(null);
    setInfo(null);

    const s = schema;
    const idCol = s?.idCol || "id";
    const r = await supabase.from("guide_section_entries").delete().eq(idCol as any, id);

    if (r.error) {
      setErr("Delete failed.\n" + fmtErr(r.error));
      setLoading(false);
      return;
    }

    setRows((p) => (p || []).filter((x) => String(x?.id ?? x?.entry_id) !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setTitle("");
      setBody("");
    }
    setInfo("Deleted.");
    setLoading(false);
  }

  const canEdit = !!props.canEdit;

  return (
    <div className="zombie-card" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 900 }}>📝 Entries</div>
        <div style={{ opacity: 0.75, fontSize: 12 }}>
          {sectionId ? `Section: ${sectionId}` : "Select a section"}
          {canEdit ? " • editor" : " • view-only"}
        </div>
      </div>

      {info ? <div style={{ marginTop: 10, opacity: 0.75, whiteSpace: "pre-wrap", fontSize: 12 }}>{info}</div> : null}
      {err ? <div style={{ marginTop: 10, color: "#ffb3b3", whiteSpace: "pre-wrap", fontSize: 12 }}>{err}</div> : null}
      {loading ? <div style={{ marginTop: 10, opacity: 0.75 }}>Working…</div> : null}

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(260px, 1fr) minmax(320px, 1.2fr)", gap: 12 }}>
        <div>
          <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 8 }}>List</div>
          <div style={{ display: "grid", gap: 8 }}>
            {rows.map((r) => {
              const id = String(r?.id ?? r?.entry_id ?? "");
              const s = schema;
              const tCol = s?.titleCol || "title";
              const title = String(r?.[tCol] ?? r?.title ?? r?.name ?? "Untitled");
              const sel = id === selectedId;

              return (
                <div
                  key={id}
                  onClick={() => setSelectedId(id)}
                  style={{
                    cursor: "pointer",
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: sel ? "rgba(120,255,120,0.10)" : "rgba(0,0,0,0.20)",
                  }}
                >
                  <div style={{ fontWeight: 900 }}>{title}</div>
                  <div style={{ opacity: 0.6, fontSize: 11, marginTop: 6 }}>{id}</div>

                  {canEdit ? (
                    <button
                      className="zombie-btn"
                      style={{ marginTop: 8, padding: "6px 8px", fontSize: 12 }}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        void deleteEntry(id);
                      }}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              );
            })}
            {rows.length === 0 ? <div style={{ opacity: 0.75 }}>No entries found.</div> : null}
          </div>
        </div>

        <div>
          <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 8 }}>{selectedId ? "Edit" : "Create"}</div>

          <div style={{ marginTop: 6 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Title</div>
            <input className="zombie-input" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} />
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Body</div>
            <textarea className="zombie-input" value={body} onChange={(e) => setBody(e.target.value)} style={{ width: "100%", minHeight: 180, padding: "10px 12px" }} />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            {canEdit ? (
              <>
                <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => void createEntry()} disabled={!sectionId || loading}>
                  Create
                </button>
                <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => void saveEntry()} disabled={!selectedId || loading}>
                  Save
                </button>
              </>
            ) : null}

            <button
              className="zombie-btn"
              style={{ padding: "10px 12px" }}
              onClick={() => {
                setSelectedId(null);
                setTitle("");
                setBody("");
                setErr(null);
                setInfo(null);
              }}
              disabled={loading}
            >
              Clear
            </button>

            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => void loadEntries()} disabled={!sectionId || loading}>
              Refresh
            </button>
          </div>

          <div style={{ marginTop: 10, opacity: 0.65, fontSize: 12, whiteSpace: "pre-wrap" }}>
            Schema (auto-detected): {schema ? `section=${schema.sectionCol} alliance=${schema.allianceCol ?? "(none)"} title=${schema.titleCol} body=${schema.bodyCol} id=${schema.idCol}` : "(unknown yet)"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GuideEntriesPanel;