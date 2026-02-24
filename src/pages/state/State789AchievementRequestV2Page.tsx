import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";

type TypeRow = { id: string; state_code: string; active?: boolean; name?: string; title?: string; kind?: string; required_count?: number };
type OptRow = { id: string; achievement_type_id: string; active?: boolean; name?: string; title?: string; label?: string; value?: string };

function pickName(x: any): string {
  return String(x?.name ?? x?.title ?? x?.label ?? x?.value ?? "Item");
}

export default function State789AchievementRequestV2Page() {
  const stateCode = "789";
  const [userId, setUserId] = useState("");

  const [cols, setCols] = useState<string[]>([]);
  const [types, setTypes] = useState<TypeRow[]>([]);
  const [options, setOptions] = useState<OptRow[]>([]);

  const [typeId, setTypeId] = useState("");
  const [optionId, setOptionId] = useState("");

  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      const u = await supabase.auth.getUser();
      setUserId(u.data.user?.id ?? "");
    })();
  }, []);

  async function loadColumns() {
    const res = await supabase.rpc("get_table_columns", { p_table: "state_achievement_requests" });
    if (res.error) { setStatus(res.error.message); return; }
    setCols((res.data ?? []).map((x: any) => String(x.column_name)));
  }

  async function loadTypes() {
    setStatus("Loading types…");
    const res = await supabase
      .from("state_achievement_types")
      .select("*")
      .eq("state_code", stateCode)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (res.error) { setStatus(res.error.message); return; }
    const list = (res.data ?? []) as any as TypeRow[];
    setTypes(list.filter((t) => (t as any).active !== false));
    setStatus("");
  }

  async function loadOptionsForType(tid: string) {
    setOptions([]);
    setOptionId("");
    if (!tid) return;

    const res = await supabase
      .from("state_achievement_options")
      .select("*")
      .eq("achievement_type_id", tid)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (res.error) { setStatus(res.error.message); return; }
    const list = (res.data ?? []) as any as OptRow[];
    setOptions(list.filter((o) => (o as any).active !== false));
  }

  useEffect(() => { void loadColumns(); void loadTypes(); }, []);
  useEffect(() => { void loadOptionsForType(typeId); }, [typeId]);

  const selectedType = useMemo(() => types.find((t) => t.id === typeId) ?? null, [types, typeId]);

  async function submit() {
    if (!userId) return alert("Sign in first.");
    if (!typeId) return alert("Pick an achievement type.");

    setStatus("Submitting…");

    // Build payload only with columns that exist
    const payload: any = {};

    // required
    if (cols.includes("state_code")) payload.state_code = stateCode;
    if (cols.includes("requester_user_id")) payload.requester_user_id = userId;
    if (cols.includes("achievement_type_id")) payload.achievement_type_id = typeId;
    if (optionId && cols.includes("achievement_option_id")) payload.achievement_option_id = optionId;

    // defaults
    if (cols.includes("status")) payload.status = "pending";
    if (cols.includes("progress_count")) payload.progress_count = 0;

    // copy required_count if column exists (else computed from type via views)
    if (cols.includes("required_count")) {
      const rc = Number((selectedType as any)?.required_count ?? 0);
      if (Number.isFinite(rc) && rc > 0) payload.required_count = rc;
    }

    // note-like column (best effort)
    const noteVal = note.trim();
    if (noteVal) {
      const candidates = ["note","notes","details","comment","evidence","evidence_url","proof_url","screenshot_url"];
      const hit = candidates.find((c) => cols.includes(c));
      if (hit) payload[hit] = noteVal;
    }

    const ins = await supabase.from("state_achievement_requests").insert(payload);
    if (ins.error) { setStatus(ins.error.message); return; }

    setTypeId("");
    setOptionId("");
    setNote("");
    setStatus("Submitted ✅");
    window.setTimeout(() => setStatus(""), 1200);
  }

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>State 789 Achievement Request (V2)</h1>
      <div style={{ opacity: 0.8, marginTop: 6 }}>
        {userId ? "Signed in ✅" : "Not signed in"} {status ? " • " + status : ""}
      </div>

      <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden", marginTop: 12 }}>
        <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>Request</div>
        <div style={{ padding: 12, display: "grid", gap: 10 }}>
          <div>
            <div style={{ opacity: 0.75, fontSize: 12 }}>Achievement Type</div>
            <select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
              <option value="">(select)</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {pickName(t)}{(t as any).kind ? ` • ${(t as any).kind}` : ""}{(t as any).required_count ? ` • req ${(t as any).required_count}` : ""}
                </option>
              ))}
            </select>
          </div>

          {options.length ? (
            <div>
              <div style={{ opacity: 0.75, fontSize: 12 }}>Option</div>
              <select value={optionId} onChange={(e) => setOptionId(e.target.value)}>
                <option value="">(select)</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {pickName(o)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <div style={{ opacity: 0.75, fontSize: 12 }}>Notes / proof (if supported by schema)</div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="Optional proof, screenshot URL, notes…" />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={submit} disabled={!userId}>Submit</button>
          </div>

          <div style={{ opacity: 0.65, fontSize: 12 }}>
            This page builds payloads from actual DB columns via <code>get_table_columns</code>, so it won’t break on schema changes.
          </div>
        </div>
      </div>
    </div>
  );
}
