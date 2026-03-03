import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";
import StateDiscordChannelSelect from "../discord/StateDiscordChannelSelect";

type Row = {
  id: string;
  state_code: string;
  channel_name: string;
  channel_id: string;
  active?: boolean;
  is_default: boolean;
  created_at: string;
};

export default function StateDiscordChannelsManagerPanel(props: { stateCode: string }) {
  const stateCode = useMemo(() => String(props.stateCode || "").trim(), [props.stateCode]);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  const [reportsChannelId, setReportsChannelId] = useState<string>("");

  const [name, setName] = useState("");
  const [channelId, setChannelId] = useState("");

  async function load() {
    if (!stateCode) return;
    setLoading(true);
    setStatus("");
    const res = await supabase
      .from("state_discord_channels")
      .select("id,state_code,channel_name,channel_id,is_default,created_at")
      .eq("state_code", stateCode)
      .order("is_default", { ascending: false })
      .order("channel_name", { ascending: true });

    setLoading(false);

    if (res.error) {
      setRows([]);
      setStatus(res.error.message);
      return;
    }
    setRows((res.data ?? []) as any);

    // Load saved defaults (reports channel)
    try {
      const d = await supabase
        .from("state_discord_defaults")
        .select("reports_channel_id")
        .eq("state_code", stateCode)
        .maybeSingle();
      setReportsChannelId(String((d.data as any)?.reports_channel_id ?? ""));
    } catch {}
  }

  useEffect(() => { void load(); }, [stateCode]);

  async function add() {
    const n = name.trim();
    const c = channelId.trim();
    if (!n || !c) return;

    setStatus("Saving…");
    const ins = await supabase.from("state_discord_channels").insert({
      state_code: stateCode,
      channel_name: n,
      channel_id: c,
      is_default: rows.length === 0, // first becomes default
    } as any);

    if (ins.error) { setStatus(ins.error.message); return; }
    setName(""); setChannelId("");
    await load();
    setStatus("Saved ✅");
    window.setTimeout(() => setStatus(""), 900);
  }

  async function setDefault(r: Row) {
    setStatus("Setting default…");

    // unset existing default
    const unset = await supabase
      .from("state_discord_channels")
      .update({ is_default: false } as any)
      .eq("state_code", stateCode)
      .eq("is_default", true);

    if (unset.error) { setStatus(unset.error.message); return; }

    const up = await supabase.from("state_discord_channels").update({ is_default: true } as any).eq("id", r.id);
    if (up.error) { setStatus(up.error.message); return; }

    await load();
    setStatus("Default set ✅");
    window.setTimeout(() => setStatus(""), 900);
  }

  async function toggleActive(r: Row) {
    setStatus("Updating…");
    const up = await supabase.from("state_discord_channels").update({ active: !r.active } as any).eq("id", r.id);
    if (up.error) { setStatus(up.error.message); return; }
    await load();
    setStatus("");
  }

  async function remove(r: Row) {
    if (!confirm("Delete this channel entry?")) return;
    setStatus("Deleting…");
    const del = await supabase.from("state_discord_channels").delete().eq("id", r.id);
    if (del.error) { setStatus(del.error.message); return; }
    await load();
    setStatus("");
  }
  async function saveReportsDefault() {
    if (!stateCode) return;
    const cid = String(reportsChannelId || "").trim();
    if (!cid) return;

    setStatus("Saving reports default…");
    const up = await supabase
      .from("state_discord_defaults")
      .upsert({ state_code: stateCode, reports_channel_id: cid } as any, { onConflict: "state_code" } as any);

    if (up.error) { setStatus(up.error.message); return; }
    setStatus("Reports default saved ✅");
    window.setTimeout(() => setStatus(""), 900);
  }

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.16)", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 900 }}>State Discord Channels</div>
          <div style={{ opacity: 0.75, fontSize: 12 }}>
            State {stateCode} • {loading ? "Loading…" : `${rows.length} saved`} {status ? " • " + status : ""}
          </div>
        </div>
        <button onClick={() => void load()}>Refresh</button>
      </div>
      <div style={{ marginTop: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 10 }}>
        <div style={{ fontWeight: 900 }}>Default Reports Channel</div>
        <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
          Used by Achievements “Export → PNG → Discord”
        </div>

        <div style={{ marginTop: 10 }}>
          <StateDiscordChannelSelect
            stateCode={stateCode}
            value={reportsChannelId}
            onChange={setReportsChannelId}
            label="Reports Channel"
          />
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => void saveReportsDefault()} disabled={!String(reportsChannelId || "").trim()}>
            Save Reports Default
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Channel name (ex: State Alerts)" />
        <input value={channelId} onChange={(e) => setChannelId(e.target.value)} placeholder="Channel ID (numbers)" />
        <div>
          <button onClick={add} disabled={!name.trim() || !channelId.trim()}>Add Channel</button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900 }}>
                  {r.is_default ? "⭐ " : ""}{r.channel_name}
                </div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>
                  {r.channel_id} • {typeof r.active === "boolean" ? (r.active ? "active" : "inactive") : "configured"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {!r.is_default ? <button onClick={() => void setDefault(r)}>Set default</button> : null}
                {typeof r.active === "boolean" ? <button onClick={() => void toggleActive(r)}>{r.active ? "Disable" : "Enable"}</button> : null}
                <button onClick={() => void remove(r)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 ? <div style={{ opacity: 0.8 }}>No channels yet.</div> : null}
      </div>
    </div>
  );
}

