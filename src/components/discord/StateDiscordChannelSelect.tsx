import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Row = {
  id: string;
  state_code: string;
  channel_name: string;
  channel_id: string;
  // optional columns (may not exist in DB)
  is_default?: boolean | null;
  active?: boolean | null;
};

type Props = {
  stateCode: string;
  value: string;
  onChange: (v: string) => void;
  label?: string;
};

export default function StateDiscordChannelSelect({ stateCode, value, onChange, label }: Props) {
  const sc = String(stateCode || "").trim();
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setErr("");
      setRows([]);

      if (!sc) return;

      const res = await supabase
        .from("state_discord_channels")
        .select("*")
        .eq("state_code", sc)
        .order("channel_name", { ascending: true });

      if (cancelled) return;

      if (res.error) {
        setErr(res.error.message);
        setRows([]);
        return;
      }

      const data = (res.data ?? []) as any[];

      // Filter out disabled channels only if 'active' exists
      const filtered = data.filter((r) => {
        if (typeof r.active === "boolean") return r.active === true;
        return true;
      }) as Row[];

      // Sort default first if is_default exists (safe)
      filtered.sort((a, b) => {
        const da = a?.is_default ? 1 : 0;
        const db = b?.is_default ? 1 : 0;
        if (db !== da) return db - da;
        return String(a.channel_name || "").localeCompare(String(b.channel_name || ""));
      });

      setRows(filtered);
    })();

    return () => {
      cancelled = true;
    };
  }, [sc]);

  const options = useMemo(() => rows, [rows]);

  return (
    <div style={{ marginTop: 10 }}>
      {label ? <div style={{ fontWeight: 900, marginBottom: 6 }}>{label}</div> : null}

      <select
        className="zombie-input"
        value={value || ""}
        onChange={(e) => onChange(String(e.target.value || ""))}
        style={{ padding: "10px 12px", width: "100%" }}
      >
        <option value="">— Choose a Discord channel —</option>
        {options.map((c) => (
          <option key={c.id || c.channel_id} value={String(c.channel_id)}>
            {c.channel_name} ({c.channel_id})
          </option>
        ))}
      </select>

      {err ? (
        <div style={{ marginTop: 8, opacity: 0.85 }}>
          <b>StateDiscordChannelSelect load error:</b> {err}
        </div>
      ) : null}
    </div>
  );
}
