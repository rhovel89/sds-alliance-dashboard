import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type AnyRow = Record<string, any>;

function upper(x: string) { return String(x || "").trim().toUpperCase(); }

export default function AllianceWebhookPicker(props: {
  allianceCode: string;                 // REQUIRED (e.g. "WOC")
  selected: string[];                   // values are webhook_id OR row.id (see valueOf)
  onChange: (next: string[]) => void;   // multi-select
  title?: string;
}) {
  const allianceCode = upper(props.allianceCode);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [status, setStatus] = useState<string>("");

  const title = props.title || "Send to specific Discord channels (webhooks)";

  function valueOf(r: AnyRow): string {
    // Prefer webhook_id if present, else fall back to primary id
    return String(r.webhook_id || r.id || "").trim();
  }

  function labelOf(r: AnyRow): string {
    const a = String(r.label || r.name || r.channel_name || r.kind || "").trim();
    const v = valueOf(r);
    return a ? `${a} (${v.slice(0, 8)}…)` : v;
  }

  const items = useMemo(() => {
    return (rows || [])
      .map((r) => ({ r, value: valueOf(r), label: labelOf(r) }))
      .filter((x) => !!x.value);
  }, [rows]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("");
      setRows([]);

      if (!allianceCode) return;

      const res = await supabase
        .from("alliance_discord_webhooks")
        .select("*")
        .eq("alliance_code", allianceCode);

      if (cancelled) return;
      if (res.error) { setStatus(res.error.message); return; }
      setRows((res.data || []) as any[]);
    }

    void load();
    return () => { cancelled = true; };
  }, [allianceCode]);

  function toggle(v: string) {
    const cur = new Set(props.selected || []);
    if (cur.has(v)) cur.delete(v); else cur.add(v);
    props.onChange(Array.from(cur));
  }

  if (!allianceCode) {
    return <div style={{ opacity: 0.75, fontSize: 12 }}>Pick an alliance filter to load its channels.</div>;
  }

  return (
    <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)" }}>
      <div style={{ fontWeight: 950, marginBottom: 6 }}>{title}</div>
      {status ? <div style={{ color: "#ff9b9b", fontSize: 12, marginBottom: 8 }}>{status}</div> : null}

      {!items.length ? (
        <div style={{ opacity: 0.8, fontSize: 12 }}>
          No webhooks found for {allianceCode}. Add them in <code>/dashboard/{allianceCode}/discord-webhooks</code>.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {items.map((x) => (
            <label key={x.value} style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={(props.selected || []).includes(x.value)}
                onChange={() => toggle(x.value)}
              />
              <span style={{ opacity: 0.95 }}>{x.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
