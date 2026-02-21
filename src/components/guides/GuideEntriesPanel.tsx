import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../system/SupportBundleButton";

type Row = Record<string, any>;

type Props = {
  allianceCode: string;
  sectionId: string | null;
  canEdit: boolean;
};

function nowUtc() { return new Date().toISOString(); }

function stripBadColumns(payload: Record<string, any>) {
  // Columns we've seen cause failures when DB doesn't have them
  const bad = ["updated_by", "created_by", "editor_id", "author_id", "owner_id"];
  const out: Record<string, any> = { ...payload };
  for (const k of bad) {
    if (k in out) delete out[k];
  }
  return out;
}

function stringify(x: any) {
  try { return JSON.stringify(x, null, 2); } catch { return String(x); }
}

export function GuideEntriesPanel({ allianceCode, sectionId, canEdit }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const [lastPayload, setLastPayload] = useState<any>(null);
  const [lastError, setLastError] = useState<any>(null);

  const disabled = !sectionId;

  async function load() {
    if (!sectionId) { setRows([]); return; }
    setLoading(true);
    setErr(null);
    try {
      const q = supabase
        .from("guide_section_entries")
        .select("*")
        .eq("section_id", sectionId)
        .order("created_at", { ascending: false });

      // If your table has alliance_code column, this further restricts reads (safe)
      const res = await q;

      if (res.error) throw res.error;
      setRows(res.data || []);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [sectionId]);

  const [editId, setEditId] = useState<string | null>(null);
  const editing = useMemo(() => (editId ? rows.find((r) => r.id === editId) || null : null), [editId, rows]);

  useEffect(() => {
    if (!editing) return;
    setTitle(String(editing.title || ""));
    setBody(String(editing.body || editing.content || ""));
  }, [editId]);

  function resetForm() {
    setEditId(null);
    setTitle("");
    setBody("");
    setLastPayload(null);
    setLastError(null);
  }

  async function createOrSave() {
    if (!canEdit) return alert("View-only (no edit permission).");
    if (!sectionId) return alert("Select a section first.");
    const t = title.trim();
    if (!t) return alert("Title required.");

    setErr(null);
    setLoading(true);

    try {
      const basePayload: any = {
        alliance_code: allianceCode,
        section_id: sectionId,
        title: t,
        body: body || "",
        updated_at: nowUtc(),
      };

      const safePayload = stripBadColumns(basePayload);
      setLastPayload(safePayload);

      if (!editId) {
        const ins = await supabase
          .from("guide_section_entries")
          .insert(safePayload as any)
          .select("*")
          .maybeSingle();

        if (ins.error) throw ins.error;
        resetForm();
        await load();
        return;
      }

      const upd = await supabase
        .from("guide_section_entries")
        .update(stripBadColumns({ title: t, body: body || "", updated_at: nowUtc() }) as any)
        .eq("id", editId);

      if (upd.error) throw upd.error;
      resetForm();
      await load();
    } catch (e: any) {
      setLastError(e);
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function del(id: string) {
    if (!canEdit) return alert("View-only (no edit permission).");
    if (!confirm("Delete entry?")) return;
    setErr(null);
    setLoading(true);
    try {
      const d = await supabase.from("guide_section_entries").delete().eq("id", id);
      if (d.error) throw d.error;
      if (editId === id) resetForm();
      await load();
    } catch (e: any) {
      setLastError(e);
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function copyDebug() {
    const payload = {
      tsUtc: nowUtc(),
      allianceCode,
      sectionId,
      canEdit,
      lastPayload,
      lastError,
    };
    const txt = stringify(payload);
    try { await navigator.clipboard.writeText(txt); alert("Copied debug bundle."); }
    catch { window.prompt("Copy:", txt); }
  }

  return (
    <div className="zombie-card" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 900 }}>📘 Entries</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={load} disabled={disabled || loading}>Reload</button>
          <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={copyDebug}>Copy Debug</button>
          <SupportBundleButton />
        </div>
      </div>

      {!sectionId ? <div style={{ marginTop: 10, opacity: 0.75 }}>Select a section to view entries.</div> : null}

      {err ? (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "rgba(255,0,0,0.12)", border: "1px solid rgba(255,0,0,0.25)" }}>
          <div style={{ fontWeight: 900 }}>Error</div>
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap", fontSize: 12 }}>{err}</div>
          <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>
            Tip: if this says "record new has no field X", your DB table lacks that column.
            The UI auto-strips common columns (like updated_by) but we may need to align more.
          </div>
          {lastPayload ? (
            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: "pointer" }}>Payload we tried</summary>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12 }}>{stringify(lastPayload)}</pre>
            </details>
          ) : null}
          {lastError ? (
            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: "pointer" }}>Raw error object</summary>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12 }}>{stringify(lastError)}</pre>
            </details>
          ) : null}
        </div>
      ) : null}

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(320px, 1.2fr)", gap: 12 }}>
        <div>
          <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Existing</div>
          <div style={{ display: "grid", gap: 8 }}>
            {rows.map((r) => (
              <div key={String(r.id)} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontWeight: 900 }}>{String(r.title || "Untitled")}</div>
                  <div style={{ marginLeft: "auto", opacity: 0.65, fontSize: 12 }}>{String(r.created_at || "")}</div>
                </div>
                <div style={{ marginTop: 6, opacity: 0.85, fontSize: 12, whiteSpace: "pre-wrap" }}>
                  {String((r.body ?? r.content ?? "")).slice(0, 140)}{String((r.body ?? r.content ?? "")).length > 140 ? "…" : ""}
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => setEditId(String(r.id))} disabled={!canEdit}>Edit</button>
                  <button className="zombie-btn" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => del(String(r.id))} disabled={!canEdit}>Delete</button>
                </div>
              </div>
            ))}
            {rows.length === 0 && sectionId ? <div style={{ opacity: 0.75 }}>No entries yet.</div> : null}
          </div>
        </div>

        <div>
          <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>{editId ? "Edit Entry" : "New Entry"}</div>

          <div>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Title</div>
            <input className="zombie-input" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} disabled={disabled || !canEdit} />
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Body</div>
            <textarea className="zombie-input" value={body} onChange={(e) => setBody(e.target.value)} style={{ width: "100%", minHeight: 160, padding: "10px 12px" }} disabled={disabled || !canEdit} />
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={createOrSave} disabled={disabled || !canEdit || loading}>
              {editId ? "Save" : "Create"}
            </button>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={resetForm} disabled={loading}>Clear</button>
          </div>

          <div style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>
            Backend RLS still enforces permissions. UI shows exact errors to fix schema/policies safely.
          </div>
        </div>
      </div>
    </div>
  );
}