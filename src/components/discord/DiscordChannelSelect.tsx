import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Scope = "state" | "alliance";
type Kind = "alerts" | "announcements";

type Row = { channel_id: string; channel_name: string | null };

export default function DiscordChannelSelect(props: {
  scope: Scope;
  kind: Kind;
  stateCode: string;
  allianceCode?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const scope = props.scope;
  const kind = props.kind;
  const stateCode = props.stateCode || "789";
  const allianceCode = (props.allianceCode || "").toUpperCase();

  const [rows, setRows] = useState<Row[]>([]);
  const [defaultId, setDefaultId] = useState<string>("");

  const defaultLabel = useMemo(() => {
    if (!defaultId) return "Default (not set)";
    return `Default (${defaultId})`;
  }, [defaultId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1) default channel id
      if (scope === "state") {
        const d = await supabase
          .from("state_discord_defaults")
          .select("alerts_channel_id,announcements_channel_id")
          .eq("state_code", stateCode)
          .maybeSingle();

        if (!cancelled && !d.error) {
          const v = kind === "alerts" ? d.data?.alerts_channel_id : d.data?.announcements_channel_id;
          setDefaultId(String(v || ""));
        }
      } else {
        const d = await supabase
          .from("alliance_discord_defaults")
          .select("alerts_channel_id,announcements_channel_id")
          .eq("alliance_code", allianceCode)
          .maybeSingle();

        if (!cancelled && !d.error) {
          const v = kind === "alerts" ? d.data?.alerts_channel_id : d.data?.announcements_channel_id;
          setDefaultId(String(v || ""));
        }
      }

      // 2) dropdown options
      if (scope === "state") {
        const r = await supabase
          .from("state_discord_channels")
          .select("channel_id,channel_name")
          .eq("state_code", stateCode)
          .order("channel_name", { ascending: true });

        if (!cancelled && !r.error) setRows((r.data || []) as any);
      } else {
        const r = await supabase
          .from("alliance_discord_channels")
          .select("channel_id,channel_name")
          .eq("alliance_code", allianceCode)
          .order("channel_name", { ascending: true });

        if (!cancelled && !r.error) setRows((r.data || []) as any);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [scope, kind, stateCode, allianceCode]);

  return (
    <select value={props.value} onChange={(e) => props.onChange(e.target.value)} style={{ padding: "8px 10px", borderRadius: 10 }}>
      <option value="">{defaultLabel}</option>
      {rows.map((r) => (
        <option key={r.channel_id} value={r.channel_id}>
          {(r.channel_name || "(unnamed)") + " • " + r.channel_id}
        </option>
      ))}
    </select>
  );
}
