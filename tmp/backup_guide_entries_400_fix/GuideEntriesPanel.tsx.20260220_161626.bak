import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type EntryRow = Record<string, any>;

export function GuideEntriesPanel(props: {
  allianceCode: string;
  sectionId: string | null;
  canEdit: boolean;
}) {
  const allianceCode = useMemo(() => (props.allianceCode || "").toString().toUpperCase(), [props.allianceCode]);
  const sectionId = props.sectionId || null;
  const canEdit = !!props.canEdit;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => (selectedId ? entries.find((e) => String(e.id) === String(selectedId)) || null : null),
    [entries, selectedId]
  );

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    // reset selection when section changes
    setSelectedId(null);
    setTitle("");
    setBody("");
  }, [sectionId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      setEntries([]);

      if (!sectionId) return;

      setLoading(true);
      try {
        const q = supabase
          .from("guide_section_entries")
          .select("id, alliance_code, section_id, title, body, created_at, updated_at")
          .eq("alliance_code", allianceCode)
          .eq("section_id", sectionId)
          .order("created_at", { ascending: false });

        const res = await q;
        if (cancelled) return;

        if (res.error) {
          setError(res.error.message);
          setEntries([]);
        } else {
          setEntries(res.data || []);
        }
      } catch (e: any) {
        if (cancelled) return;
        setError(String(e?.message || e || "Failed to load entries"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [allianceCode, sectionId]);

  function startNew() {
    setSelectedId(null);
    setTitle("");
    setBody("");
  }

  function startEdit(e: EntryRow) {
    setSelectedId(String(e.id));
    setTitle(String(e.title || ""));
    setBody(String(e.body || ""));
  }

  async function createEntry() {
    if (!sectionId) return;
    const t = title.trim();
    if (!t) return window.alert("Title is required.");

    setLoading(true);
    setError(null);
    try {
      const ins = await supabase
        .from("guide_section_entries")
        .insert({
          alliance_code: allianceCode,
          section_id: sectionId,
          title: t,
          body: body || null,
        } as any)
        .select("id, alliance_code, section_id, title, body, created_at, updated_at")
        .maybeSingle();

      if (ins.error) {
        setError(ins.error.message);
      } else if (ins.data) {
        setEntries((p) => [ins.data as any, ...(p || [])]);
        startNew();
      }
    } catch (e: any) {
      setError(String(e?.message || e || "Create failed"));
    } finally {
      setLoading(false);
    }
  }

  async function saveEntry() {
    const t = title.trim();
    if (!t) return window.alert("Title is required.");
    if (!selectedId) return window.alert("No entry selected.");

    setLoading(true);
    setError(null);
    try {
      const up = await supabase
        .from("guide_section_entries")
        .update({
          title: t,
          body: body || null,
        } as any)
        .eq("id", selectedId)
        .select("id, alliance_code, section_id, title, body, created_at, updated_at")
        .maybeSingle();

      if (up.error) {
        setError(up.error.message);
      } else if (up.data) {
        setEntries((p) => (p || []).map((x) => (String(x.id) === String(selectedId) ? (up.data as any) : x)));
      }
    } catch (e: any) {
      setError(String(e?.message || e || "Update failed"));
    } finally {
      setLoading(false);
    }
  }

  async function deleteEntry(id: string) {
    if (!window.confirm("Delete this entry?")) return;
    setLoading(true);
    setError(null);
    try {
      const del = await supabase.from("guide_section_entries").delete().eq("id", id);
      if (del.error) {
        setError(del.error.message);
      } else {
        setEntries((p) => (p || []).filter((x) => String(x.id) !== String(id)));
        if (String(selectedId) === String(id)) startNew();
      }
    } catch (e: any) {
      setError(String(e?.message || e || "Delete failed"));
    } finally {
      setLoading(false);
    }
  }

  if (!sectionId) {
    return (
      <div className="zombie-card" style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 900 }}>📝 Guide Entries</div>
        <div style={{ marginTop: 8, opacity: 0.75 }}>Select a section to view entries.</div>
      </div>
    );
  }

  return (
    <div className="zombie-card" style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 900 }}>📝 Guide Entries</div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          Alliance: <b>{allianceCode}</b>
        </div>
      </div>

      {error ? (
        <div style={{ marginTop: 10, color: "#ffb3b3", fontSize: 12, whiteSpace: "pre-wrap" }}>{error}</div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 1fr) minmax(280px, 1.2fr)", gap: 12, marginTop: 12 }}>
        {/* Left: list */}
        <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 13 }}>Entries</div>
            {canEdit ? (
              <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={startNew}>
                + New
              </button>
            ) : null}
          </div>

          {loading ? <div style={{ marginTop: 10, opacity: 0.75 }}>Loading…</div> : null}

          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {(entries || []).map((e) => {
              const isSel = String(e.id) === String(selectedId);
              return (
                <div
                  key={String(e.id)}
                  onClick={() => startEdit(e)}
                  style={{
                    cursor: "pointer",
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: isSel ? "rgba(120,255,120,0.10)" : "rgba(0,0,0,0.20)",
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: 13 }}>{String(e.title || "Untitled")}</div>
                  <div style={{ marginTop: 6, opacity: 0.7, fontSize: 11 }}>
                    {e.created_at ? new Date(String(e.created_at)).toLocaleString() : ""}
                  </div>

                  {canEdit ? (
                    <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                      <button
                        className="zombie-btn"
                        style={{ padding: "6px 8px", fontSize: 12 }}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          deleteEntry(String(e.id));
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {entries.length === 0 && !loading ? <div style={{ opacity: 0.75 }}>No entries yet.</div> : null}
          </div>
        </div>

        {/* Right: editor */}
        <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 13 }}>
            {selected ? "Edit Entry" : "New Entry"}
            {!canEdit ? <span style={{ marginLeft: 8, opacity: 0.65 }}>(view only)</span> : null}
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Title</div>
            <input
              className="zombie-input"
              value={title}
              disabled={!canEdit}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: "100%", padding: "10px 12px" }}
              placeholder="Entry title…"
            />
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Body</div>
            <textarea
              className="zombie-input"
              value={body}
              disabled={!canEdit}
              onChange={(e) => setBody(e.target.value)}
              style={{ width: "100%", minHeight: 160, padding: "10px 12px" }}
              placeholder="Write the entry…"
            />
          </div>

          {canEdit ? (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
              {!selected ? (
                <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={createEntry} disabled={loading}>
                  Create
                </button>
              ) : (
                <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={saveEntry} disabled={loading}>
                  Save
                </button>
              )}
              <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={startNew} disabled={loading}>
                Clear
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default GuideEntriesPanel;