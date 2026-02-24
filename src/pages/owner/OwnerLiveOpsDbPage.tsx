import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";

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

export default function OwnerLiveOpsDbPage() {
  const [stateCode, setStateCode] = useState("789");
  const [docText, setDocText] = useState("{}");
  const [status, setStatus] = useState("");

  async function load() {
    setStatus("Loading…");
    const res = await supabase.from("state_live_ops_docs").select("doc").eq("state_code", stateCode).single();
    if (res.error) { setStatus(res.error.message); return; }
    setDocText(JSON.stringify(res.data.doc ?? {}, null, 2));
    setStatus("");
  }

  useEffect(() => { void load(); }, [stateCode]);

  async function save() {
    setStatus("Saving…");
    let obj: any = {};
    try { obj = JSON.parse(docText); } catch (e: any) { setStatus("Invalid JSON: " + String(e?.message ?? e)); return; }

    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id ?? null;

    const up = await supabase
      .from("state_live_ops_docs")
      .upsert({ state_code: stateCode, doc: obj, updated_by_user_id: uid }, { onConflict: "state_code" });

    if (up.error) { setStatus(up.error.message); return; }
    setStatus("Saved ✅");
    window.setTimeout(() => setStatus(""), 1200);
  }

  function exportJson() {
    downloadText(`live-ops-${stateCode}.json`, docText);
  }

  function importJson(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result ?? "{}"));
        setDocText(JSON.stringify(obj, null, 2));
        alert("Imported into editor (not saved yet). Click Save.");
      } catch (e: any) {
        alert("Import failed: " + String(e?.message ?? e));
      }
    };
    reader.readAsText(file);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>Owner Live Ops (DB)</h1>
      <div style={{ opacity: 0.8, marginTop: 6 }}>
        Saves/loads a state Live Ops JSON doc in Supabase. {status ? " • " + status : ""}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
        <label style={{ opacity: 0.8 }}>State</label>
        <input value={stateCode} onChange={(e) => setStateCode(e.target.value)} style={{ width: 100 }} />
        <button onClick={load}>Reload</button>
        <button onClick={save}>Save</button>
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
      </div>

      <div style={{ marginTop: 12 }}>
        <textarea
          value={docText}
          onChange={(e) => setDocText(e.target.value)}
          rows={24}
          style={{ width: "100%", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
        />
      </div>

      <div style={{ opacity: 0.65, fontSize: 12, marginTop: 10 }}>
        Access is controlled by owner/admin or state grant <code>can_manage_live_ops</code>.
      </div>
    </div>
  );
}
