import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";

type Row = {
  id: string;
  state_code: string;
  channel_name: string;
  channel_id: string;
  active: boolean;
  is_default: boolean;
};

export default function StateDiscordChannelSelect(props: {
  stateCode: string;
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  const stateCode = String(props.stateCode || "").trim();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const label = props.label ?? "Discord Channel";

  async function load() {
    if (!stateCode) return;
    setLoading(true);
    const res = await supabase
      .from("state_discord_channels")
      .select("id,state_code,channel_name,channel_id,active,is_default")
      .eq("state_code", stateCode)
      .eq("active", true)
      .order("is_default", { ascending: false })
      .order("channel_name", { ascending: true });

    setLoading(false);
    if (res.error) {
      console.warn("StateDiscordChannelSelect load error:", res.error.message);
      setRows([]);
      return;
    }
    setRows((res.data ?? []) as any);
  }

  useEffect(() => { void load(); }, [stateCode]);

  const defaultId = useMemo(() => {
    const d = rows.find((r) => r.is_default);
    return d?.channel_id ?? "";
  }, [rows]);

  // If empty selection, auto-fill default
  useEffect(() => {
    if (!props.value && defaultId) props.onChange(defaultId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultId]);

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontWeight: 900, marginBottom: 6 }}>
        {label} {loading ? <span style={{ opacity: 0.7, fontWeight: 600 }}>(loading…)</span> : null}
      </div>

      <select
        value={props.value || ""}
        onChange={(e) => props.onChange(e.target.value)}
        style={{ width: "100%", padding: 10, borderRadius: 10 }}
      >
        <option value="">(use default)</option>
        {rows.map((r) => (
          <option key={r.id} value={r.channel_id}>
            {r.is_default ? "⭐ " : ""}{r.channel_name} — {r.channel_id}
          </option>
        ))}
      </select>

      <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
        Tip: choose a channel, or leave blank to use the default.
      </div>
    </div>
  );
}
