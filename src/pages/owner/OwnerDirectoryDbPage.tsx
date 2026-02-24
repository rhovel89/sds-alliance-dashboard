import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";

type Entry = {
  id?: string;
  state_code: string;
  alliance_code: string;
  tag: string;
  name: string;
  alliance_id: string | null;
  active: boolean;
  sort_order: number;
  notes: string;
  updated_at?: string;
};

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

export default function OwnerDirectoryDbPage() {
  const [stateCode, setStateCode] = useState("789");
  const [rows, setRows] = useState<Entry[]>([]);
  const [status, setStatus] = useState("");

  async function load() {
    setStatus("Loading…");
    const res = await supabase
      .from("alliance_directory_entries")
      .select("*")
      .eq("state_code", stateCode)
      .order("sort_order", { ascending: true })
      .order("alliance_code", { ascending: true });

    if (res.error) {
      setStatus(res.error.message);
      return;
    }
    setRows((res.data ?? []) as any);
    setStatus("");
  }

  useEffect(() => { void load(); }, [stateCode]);

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        state_code: stateCode,
        alliance_code: "",
        tag: "",
        name: "",
        alliance_id: null,
        active: true,
        sort_order: 1000,
        notes: "",
      },
    ]);
  }

  function updateRow(i: number, patch: Partial<Entry>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function saveAll() {
    setStatus("Saving…");
    const payload = rows.map((r) => ({
      id: r.id,
      state_code: r.state_code,
      alliance_code: r.alliance_code.trim(),
      tag: r.tag.trim(),
      name: r.name.trim(),
      alliance_id: r.alliance_id ? r.alliance_id.trim() : null,
      active: !!r.active,
      sort_order: Number.isFinite(Number(r.sort_order)) ? Number(r.sort_order) : 1000,
      notes: r.notes ?? "",
    })).filter((r) => r.alliance_code);

    const res = await supabase
      .from("alliance_directory_entries")
      .upsert(payload, { onConflict: "state_code,alliance_code" })
      .select("*");

    if (res.error) {
      setStatus(res.error.message);
      return;
    }

    setRows((res.data ?? []) as any);
    setStatus("Saved ✅");
    window.setTimeout(() => setStatus(""), 1200);
  }

  async function deleteRow(r: Entry) {
    const ok = confirm(`Delete ${r.alliance_code}?`);
    if (!ok) return;

    setStatus("Deleting…");
    const q = supabase.from("alliance_directory_entries").delete().eq("state_code", r.state_code).eq("alliance_code", r.alliance_code);
    const res = await q;
    if (res.error) {
      setStatus(res.error.message);
      return;
    }
    await load();
    setStatus("");
  }

  function exportJson() {
    const raw = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), stateCode, entries: rows }, null, 2);
    downloadText(`alliance-directory-${stateCode}.json`, raw);
  }

  function importJson(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result ?? ""));
        const entries = Array.isArray(obj) ? obj : (obj.entries ?? obj.alliances ?? []);
        if (!Array.isArray(entries)) throw new Error("Expected array or {entries: []}");
        const cleaned: Entry[] = entries.map((x: any) => ({
          id: x.id,
          state_code: String(x.state_code ?? x.stateCode ?? stateCode),
          alliance_code: String(x.alliance_code ?? x.allianceCode ?? x.code ?? "").trim(),
          tag: String(x.tag ?? ""),
          name: String(x.name ?? ""),
          alliance_id: x.alliance_id ? String(x.alliance_id) : (x.allianceId ? String(x.allianceId) : null),
          active: x.active !== false,
          sort_order: Number.isFinite(Number(x.sort_order ?? x.sortOrder)) ? Number(x.sort_order ?? x.sortOrder) : 1000,
          notes: String(x.notes ?? ""),
        })).filter((x) => x.alliance_code);

        setRows(cleaned);
        alert("Imported into editor (not saved yet). Click Save All.");
      } catch (e: any) {
        alert("Import failed: " + String(e?.message ?? e));
      }
    };
    reader.readAsText(file);
  }

  const missing = useMemo(() => rows.filter((r) => !r.alliance_id).length, [rows]);

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>Owner Directory (DB)</h1>
      <div style={{ opacity: 0.8, marginTop: 6 }}>
        Edits are shared for everyone. {status ? " • " + status : ""}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
        <label style={{ opacity: 0.8 }}>State</label>
        <input value={stateCode} onChange={(e) => setStateCode(e.target.value)} style={{ width: 100 }} />
        <button onClick={load}>Reload</button>
        <button onClick={addRow}>+ Add Row</button>
        <button onClick={saveAll}>Save All</button>
        <button onClick={exportJson}>Export</button>
        <label style={{ cursor: "pointer" }}>
          <input
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJson(f);
              e.currentTarget.value = "";
            }}
          />
          <span style={{ padding: "6px 10px", border: "1px solid #666", borderRadius: 8 }}>Import</span>
        </label>
        <div style={{ opacity: 0.75 }}>Rows: {rows.length} • missing alliance_id: {missing}</div>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((r, i) => (
          <div key={`${r.alliance_code || "new"}_${i}`} style={{ border: "1px solid #333", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 10 }}>
              <div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>Alliance Code</div>
                <input value={r.alliance_code} onChange={(e) => updateRow(i, { alliance_code: e.target.value })} />
              </div>
              <div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>Tag</div>
                <input value={r.tag} onChange={(e) => updateRow(i, { tag: e.target.value })} />
              </div>
              <div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>Name</div>
                <input value={r.name} onChange={(e) => updateRow(i, { name: e.target.value })} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 2fr", gap: 10, marginTop: 10 }}>
              <div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>Alliance ID (UUID)</div>
                <input value={r.alliance_id ?? ""} onChange={(e) => updateRow(i, { alliance_id: e.target.value || null })} placeholder="optional" />
              </div>
              <div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>Sort</div>
                <input type="number" value={String(r.sort_order)} onChange={(e) => updateRow(i, { sort_order: Number(e.target.value) })} />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
                <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="checkbox" checked={!!r.active} onChange={(e) => updateRow(i, { active: e.target.checked })} />
                  active
                </label>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end" }}>
                <button onClick={() => deleteRow(r)} disabled={!r.alliance_code}>Delete</button>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{ opacity: 0.7, fontSize: 12 }}>Notes</div>
              <textarea value={r.notes} onChange={(e) => updateRow(i, { notes: e.target.value })} rows={2} style={{ width: "100%" }} />
            </div>
          </div>
        ))}
        {rows.length === 0 ? <div style={{ opacity: 0.75 }}>No directory rows.</div> : null}
      </div>
    </div>
  );
}
